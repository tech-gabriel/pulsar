import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloPoligono } from '../../utils/risco';
import { normalizarNome } from '../../utils/texto';
import { tooltipSubprefeituraHtml } from './tooltipSub';

interface Props {
  geojson: GeoJsonObject;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
}

function nomeFeature(feature: Feature): string {
  return (feature.properties as Record<string, string>)?.nm_subprefeitura ?? '';
}

export default function RegioesLayer({
  geojson,
  subprefeituras,
  subSelecionada,
  onSelecionarSub,
}: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  // Refs para os handlers (hover/click) sempre lerem dados atuais.
  const subsRef = useRef(subprefeituras);
  const selRef = useRef(subSelecionada);
  subsRef.current = subprefeituras;
  selRef.current = subSelecionada;

  function subDaFeature(feature: Feature): SubprefeituraMapaDto | undefined {
    const alvo = normalizarNome(nomeFeature(feature));
    return subsRef.current.find((s) => normalizarNome(s.nome) === alvo);
  }

  function estilo(sub: SubprefeituraMapaDto | undefined, selecionada: boolean): PathOptions {
    const base = estiloPoligono(sub?.faixaRisco);
    if (selecionada) {
      return {
        fillColor: base.fillColor,
        fillOpacity: base.fillOpacity + 0.1,
        color: '#ffffff',
        opacity: 1,
        weight: 2,
        dashArray: '5 5',
      };
    }
    return {
      fillColor: base.fillColor,
      fillOpacity: base.fillOpacity,
      color: base.color,
      opacity: base.opacity,
      weight: base.weight,
      dashArray: undefined,
    };
  }

  // Aplica o estilo atual (faixa + seleção) a uma camada e alterna a classe
  // de "marching ants" no elemento SVG.
  function aplicarEstilo(layer: L.Path) {
    const feature = (layer as unknown as { feature: Feature }).feature;
    const sub = subDaFeature(feature);
    const selecionada = !!selRef.current && sub?.id === selRef.current.id;
    layer.setStyle(estilo(sub, selecionada));
    // Path não expõe getElement(); o renderer SVG guarda o <path> em _path.
    const el = (layer as unknown as { _path?: SVGElement })._path;
    if (el) el.classList.toggle('poligono-selecionado', selecionada);
  }

  // Re-estiliza quando os dados das subprefeituras ou a seleção mudam.
  useEffect(() => {
    layerRef.current?.eachLayer((layer) => aplicarEstilo(layer as L.Path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subprefeituras, subSelecionada]);

  function onEachFeature(feature: Feature, layer: Layer) {
    const path = layer as L.Path;

    // Tooltip dinâmico (lê dados frescos a cada abertura).
    path.bindTooltip(() => tooltipSubprefeituraHtml(subDaFeature(feature), nomeFeature(feature)), {
      sticky: true,
      direction: 'top',
      className: 'pulsar-tooltip',
      opacity: 1,
    });

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as L.Path;
        const sub = subDaFeature(feature);
        const base = estiloPoligono(sub?.faixaRisco);
        target.setStyle({
          fillOpacity: base.fillOpacity + 0.15,
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
