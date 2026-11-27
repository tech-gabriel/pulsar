import { useEffect, useMemo, useRef } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import type { ExpressionSpecification, LngLat, MapLayerMouseEvent } from 'maplibre-gl';
import maplibregl from './maplibre';
import type { SubprefeituraMapaDto } from '../../types';
import type { Camada } from '../../utils/camadas';
import { useTheme } from '../../hooks/useTheme';
import { montarRegioes } from './regioesGeo';
import { deslocamentoDoPainel, paddingDoPainel } from './geometria';
import { tooltipSubprefeituraHtml } from './tooltipSub';
import { ZOOM } from './zoom';
import { ID_TRECHOS_FILL } from './TrechosLayer';
import { criarRepouso } from './repouso';
import { CAMADAS_TOQUE_POR_CIMA } from './camadasPorCima';

export const ID_FONTE_REGIOES = 'pulsar-regioes';
const FILL = 'pulsar-regioes-fill';
const BORDA = 'pulsar-regioes-borda';
const SEL = 'pulsar-regioes-sel';
/** Camadas que, quando tocadas, não selecionam a subprefeitura de baixo (alagamentos e trechos). */
const CAMADAS_POR_CIMA = [...CAMADAS_TOQUE_POR_CIMA, ID_TRECHOS_FILL];

const HOVER: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false];
const FILL_TOQUE = { 'fill-color': '#000000', 'fill-opacity': 0 } as const;
// Divisa fina tracejada; a selecionada ganha um contorno firme e parado (sem animação).
const LARGURA_DIVISA: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 9, 0.8, 13, 1.4];
const LARGURA_SEL: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 9, 1.8, 13, 3];
const OPACIDADE_DIVISA: ExpressionSpecification = ['case', HOVER, 1, ['==', ['get', 'estado'], 'fora'], 0.3, 0.7];

interface Props {
  geojson: FeatureCollection;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
  zonaEmFoco: string | null;
  idPrimeiroSimbolo: string | undefined;
  /** Sem efeito desde o mapa limpo (área não pinta); mantido porque MapaGL ainda passa. */
  comTrechos?: boolean;
}

export default function RegioesLayer({ geojson, subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva, zonaEmFoco, idPrimeiroSimbolo }: Props) {
  const { current: mapRef } = useMap();
  const escuro = useTheme().theme === 'dark';
  const dados = useMemo(
    () => montarRegioes(geojson, subprefeituras, camadaAtiva, subSelecionada?.id ?? null, zonaEmFoco),
    [geojson, subprefeituras, camadaAtiva, subSelecionada, zonaEmFoco],
  );

  // Handlers leem sempre o dado atual.
  const subsRef = useRef(subprefeituras);
  const onSelRef = useRef(onSelecionarSub);
  useEffect(() => {
    subsRef.current = subprefeituras;
    onSelRef.current = onSelecionarSub;
  });

  // Hover (tooltip que segue o mouse) e clique/toque.
  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const comMouse = window.matchMedia('(hover: hover)').matches;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: 'none', className: 'pulsar-tooltip' });
    let hoverId: number | string | undefined;
    // O tooltip não persegue o mouse: aparece quando ele para (0,4 s), fica fixo e some ao mexer,
    // arrastar ou dar zoom. Assim não atrapalha quem está navegando.
    const tooltip = criarRepouso<{ lngLat: LngLat; subId: unknown; nome: string }>(
      400,
      ({ lngLat, subId, nome }) => {
        if (!mapa.style) return;
        const sub = subsRef.current.find((s) => s.id === subId);
        popup.setLngLat(lngLat).setHTML(tooltipSubprefeituraHtml(sub, nome)).addTo(mapa);
      },
      () => popup.remove(),
    );

    const limparHover = () => {
      if (hoverId !== undefined && mapa.style && mapa.getSource(ID_FONTE_REGIOES)) {
        mapa.setFeatureState({ source: ID_FONTE_REGIOES, id: hoverId }, { hover: false });
      }
      hoverId = undefined;
      tooltip.cancelar();
      mapa.getCanvas().style.cursor = '';
    };
    const temAlagamentoNoPonto = (e: MapLayerMouseEvent) => {
      const porCima = CAMADAS_POR_CIMA.filter((id) => mapa.getLayer(id));
      return porCima.length > 0 && mapa.queryRenderedFeatures(e.point, { layers: porCima }).length > 0;
    };
    const mover = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      // Sobre um alagamento, quem fala é o alagamento: sem tooltip da subprefeitura por cima.
      if (temAlagamentoNoPonto(e)) {
        limparHover();
        mapa.getCanvas().style.cursor = 'pointer';
        return;
      }
      if (f.id !== hoverId) {
        limparHover();
        hoverId = f.id;
        if (hoverId !== undefined) mapa.setFeatureState({ source: ID_FONTE_REGIOES, id: hoverId }, { hover: true });
      }
      mapa.getCanvas().style.cursor = 'pointer';
      if (comMouse) tooltip.mover({ lngLat: e.lngLat, subId: f.properties?.subId, nome: String(f.properties?.nome ?? '') });
    };
    const clicar = (e: MapLayerMouseEvent) => {
      if (temAlagamentoNoPonto(e)) return;
      const sub = subsRef.current.find((s) => s.id === e.features?.[0]?.properties?.subId);
      if (!sub) return;
      onSelRef.current(sub);
      mapa.flyTo({ center: [sub.longitude, sub.latitude], zoom: ZOOM.sub, duration: 600, offset: deslocamentoDoPainel(paddingDoPainel(mapa.getContainer())) });
    };

    // Trocar o tema recria a fonte: o hover e o tooltip da fonte velha não valem mais.
    const aoTrocarEstilo = () => {
      if (hoverId !== undefined && !mapa.getSource(ID_FONTE_REGIOES)) {
        hoverId = undefined;
        tooltip.cancelar();
      }
    };
    const aoNavegar = () => tooltip.cancelar();

    mapa.on('styledata', aoTrocarEstilo);
    mapa.on('movestart', aoNavegar);
    mapa.on('mousemove', FILL, mover);
    mapa.on('mouseleave', FILL, limparHover);
    mapa.on('click', FILL, clicar);
    return () => {
      mapa.off('styledata', aoTrocarEstilo);
      mapa.off('movestart', aoNavegar);
      mapa.off('mousemove', FILL, mover);
      mapa.off('mouseleave', FILL, limparHover);
      mapa.off('click', FILL, clicar);
      tooltip.cancelar();
    };
  }, [mapRef]);

  return (
    <Source id={ID_FONTE_REGIOES} type="geojson" data={dados}>
      <Layer id={FILL} type="fill" beforeId={idPrimeiroSimbolo} paint={FILL_TOQUE} />
      <Layer
        id={BORDA}
        type="line"
        beforeId={idPrimeiroSimbolo}
        filter={['!=', ['get', 'estado'], 'selecionada']}
        layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': escuro ? 'rgba(169,205,230,.7)' : 'rgba(51,65,85,.7)', 'line-opacity': OPACIDADE_DIVISA, 'line-width': LARGURA_DIVISA, 'line-dasharray': [3, 2] }}
      />
      <Layer
        id={SEL}
        type="line"
        beforeId={idPrimeiroSimbolo}
        filter={['==', ['get', 'estado'], 'selecionada']}
        layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': escuro ? '#F0F9FF' : '#0F172A', 'line-opacity': 0.9, 'line-width': LARGURA_SEL }}
      />
    </Source>
  );
}
