import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { normalizarNome } from '../../utils/texto';
import { tooltipSubprefeituraHtml } from './tooltipSub';

interface Props {
  geojson: GeoJsonObject;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
  regiaoSelecionadaNome: string | null;
}

function nomeFeature(feature: Feature): string {
  return (feature.properties as Record<string, string>)?.nm_subprefeitura ?? '';
}

export default function RegioesLayer({
  geojson,
  subprefeituras,
  subSelecionada,
  onSelecionarSub,
  camadaAtiva,
  regiaoSelecionadaNome,
}: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  // Refs para os handlers (hover/click) sempre lerem dados atuais.
  const subsRef = useRef(subprefeituras);
  const selRef = useRef(subSelecionada);
  const camadaRef = useRef(camadaAtiva);
  const regiaoRef = useRef(regiaoSelecionadaNome);
  subsRef.current = subprefeituras;
  selRef.current = subSelecionada;
  camadaRef.current = camadaAtiva;
  regiaoRef.current = regiaoSelecionadaNome;

  // True quando a subprefeitura pertence à região atualmente selecionada (4.7).
  function naRegiaoAtiva(sub: SubprefeituraMapaDto | undefined): boolean {
    const regiao = regiaoRef.current;
    if (!regiao) return true;
    return !!sub && normalizarNome(sub.regiaoNome) === normalizarNome(regiao);
  }

  function subDaFeature(feature: Feature): SubprefeituraMapaDto | undefined {
    const alvo = normalizarNome(nomeFeature(feature));
    return subsRef.current.find((s) => normalizarNome(s.nome) === alvo);
  }

  // Estilo base do polígono na camada ativa (preenchimento mais sutil que o label).
  function estiloBase(sub: SubprefeituraMapaDto | undefined): PathOptions {
    if (!sub) {
      return { fillColor: '#94a3b8', fillOpacity: 0.12, color: '#94a3b8', opacity: 0.3, weight: 1 };
    }
    const e = estiloCamada(sub, camadaRef.current);
    return {
      fillColor: e.fillColor,
      fillOpacity: e.fillOpacity,
      color: e.borderColor,
      opacity: 0.6,
      weight: e.weight,
    };
  }

  function estilo(sub: SubprefeituraMapaDto | undefined, selecionada: boolean): PathOptions {
    const base = estiloBase(sub);
    const temRegiao = !!regiaoRef.current;
    const naRegiao = naRegiaoAtiva(sub);

    // Demais regiões ficam esmaecidas quando há uma região selecionada (4.7).
    if (temRegiao && !naRegiao) {
      return {
        fillColor: base.fillColor,
        fillOpacity: 0.05,
        color: base.color,
        opacity: 0.15,
        weight: 1,
        dashArray: undefined,
      };
    }
    // Subprefeitura clicada: borda branca tracejada (marching ants).
    if (selecionada) {
      return {
        fillColor: base.fillColor,
        fillOpacity: (base.fillOpacity ?? 0.2) + 0.1,
        color: '#ffffff',
        opacity: 1,
        weight: 2,
        dashArray: '5 5',
      };
    }
    // Demais subprefeituras da região selecionada: borda branca destacada.
    if (temRegiao && naRegiao) {
      return {
        fillColor: base.fillColor,
        fillOpacity: (base.fillOpacity ?? 0.2) + 0.05,
        color: '#ffffff',
        opacity: 0.9,
        weight: 2,
        dashArray: undefined,
      };
    }
    return { ...base, dashArray: undefined };
  }

  // Aplica o estilo atual (camada + seleção + região) a uma camada e alterna as
  // classes de animação no elemento SVG.
  function aplicarEstilo(layer: L.Path) {
    const feature = (layer as unknown as { feature: Feature }).feature;
    const sub = subDaFeature(feature);
    const selecionada = !!selRef.current && sub?.id === selRef.current.id;
    const destacaRegiao = !!regiaoRef.current && naRegiaoAtiva(sub) && !selecionada;
    layer.setStyle(estilo(sub, selecionada));
    // Path não expõe getElement(); o renderer SVG guarda o <path> em _path.
    const el = (layer as unknown as { _path?: SVGElement })._path;
    if (el) {
      el.classList.toggle('poligono-selecionado', selecionada);
      el.classList.toggle('poligono-regiao', destacaRegiao);
    }
  }

  // Re-estiliza quando os dados, a seleção, a camada ou a região mudam.
  useEffect(() => {
    layerRef.current?.eachLayer((layer) => aplicarEstilo(layer as L.Path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subprefeituras, subSelecionada, camadaAtiva, regiaoSelecionadaNome]);

  function onEachFeature(feature: Feature, layer: Layer) {
    const path = layer as L.Path;

    // Tooltip dinâmico glass (lê dados frescos a cada abertura). sticky: segue o
    // mouse dentro do polígono. É o único tooltip do mapa (labels não têm).
    path.bindTooltip(
      () => tooltipSubprefeituraHtml(subDaFeature(feature), nomeFeature(feature)),
      { sticky: true, direction: 'auto', offset: [10, 0], className: 'pulsar-tooltip', opacity: 1 },
    );

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as L.Path;
        const sub = subDaFeature(feature);
        const base = estiloBase(sub);
        target.setStyle({
          fillOpacity: (base.fillOpacity ?? 0.2) + 0.15,
          weight: 2.5,
          color: 'rgba(255,255,255,0.6)',
          opacity: 1,
        });
        target.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
        aplicarEstilo(e.target as L.Path);
      },
      click: () => {
        const sub = subDaFeature(feature);
        if (sub) {
          onSelecionarSub(sub);
          map.flyTo([sub.latitude, sub.longitude], 13, { duration: 0.6 });
        }
      },
    });
  }

  return (
    <GeoJSON
      key={subprefeituras.length} // recria quando os dados chegam
      ref={layerRef}
      data={geojson}
      style={(feature) => {
        const sub = feature ? subDaFeature(feature as Feature) : undefined;
        const selecionada = !!subSelecionada && sub?.id === subSelecionada.id;
        return estilo(sub, selecionada);
      }}
      onEachFeature={onEachFeature}
    />
  );
}
