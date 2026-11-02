import { useEffect, useMemo, useRef } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import type { ExpressionSpecification, MapLayerMouseEvent } from 'maplibre-gl';
import maplibregl from './maplibre';
import type { SubprefeituraMapaDto } from '../../types';
import type { Camada } from '../../utils/camadas';
import { usePrefereMenosMovimento } from '../../hooks/usePrefereMenosMovimento';
import { montarRegioes } from './regioesGeo';
import { paddingDoPainel } from './geometria';
import { tooltipSubprefeituraHtml } from './tooltipSub';
import { ZOOM } from './zoom';

export const ID_FONTE_REGIOES = 'pulsar-regioes';
const FILL = 'pulsar-regioes-fill';
const BORDA = 'pulsar-regioes-borda';
const SEL = 'pulsar-regioes-sel';
/** Camadas que, quando tocadas, não selecionam a subprefeitura de baixo (alagamentos). */
const CAMADAS_POR_CIMA = ['pulsar-ocorr-cluster', 'pulsar-ocorr-ponto'];

const HOVER: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false];
const BASE_FILL: ExpressionSpecification = ['+', ['get', 'fillOpacity'], ['case', HOVER, 0.15, 0]];
// O risco some conforme o zoom chega na rua: igual até z11, ~0,06 em z14 (0,28 × 0,214).
const OPACIDADE_BORDA: ExpressionSpecification = ['case', HOVER, 1, ['get', 'bordaOpacidade']];
const OPACIDADE_FILL: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 11, BASE_FILL, 14, ['*', BASE_FILL, 0.214]];

// Borda "andando" da selecionada (marching ants), como no exemplo de dasharray animado do MapLibre.
const PASSOS_TRACEJADO: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

interface Props {
  geojson: FeatureCollection;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
  zonaEmFoco: string | null;
  idPrimeiroSimbolo: string | undefined;
}

export default function RegioesLayer({ geojson, subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva, zonaEmFoco, idPrimeiroSimbolo }: Props) {
  const { current: mapRef } = useMap();
  const menosMovimento = usePrefereMenosMovimento();
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

    const limparHover = () => {
      if (hoverId !== undefined) mapa.setFeatureState({ source: ID_FONTE_REGIOES, id: hoverId }, { hover: false });
      hoverId = undefined;
      popup.remove();
      mapa.getCanvas().style.cursor = '';
    };
    const mover = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      if (f.id !== hoverId) {
        limparHover();
        hoverId = f.id;
        if (hoverId !== undefined) mapa.setFeatureState({ source: ID_FONTE_REGIOES, id: hoverId }, { hover: true });
      }
      mapa.getCanvas().style.cursor = 'pointer';
      if (!comMouse) return;
      const sub = subsRef.current.find((s) => s.id === f.properties?.subId);
      popup.setLngLat(e.lngLat).setHTML(tooltipSubprefeituraHtml(sub, String(f.properties?.nome ?? ''))).addTo(mapa);
    };
    const clicar = (e: MapLayerMouseEvent) => {
      const porCima = CAMADAS_POR_CIMA.filter((id) => mapa.getLayer(id));
      if (porCima.length && mapa.queryRenderedFeatures(e.point, { layers: porCima }).length) return;
      const sub = subsRef.current.find((s) => s.id === e.features?.[0]?.properties?.subId);
      if (!sub) return;
      onSelRef.current(sub);
      mapa.flyTo({ center: [sub.longitude, sub.latitude], zoom: ZOOM.sub, duration: 600, padding: paddingDoPainel(mapa.getContainer()) });
    };

    mapa.on('mousemove', FILL, mover);
    mapa.on('mouseleave', FILL, limparHover);
    mapa.on('click', FILL, clicar);
    return () => {
      mapa.off('mousemove', FILL, mover);
      mapa.off('mouseleave', FILL, limparHover);
      mapa.off('click', FILL, clicar);
      popup.remove();
    };
  }, [mapRef]);

  // Animações: borda da selecionada andando e pulso da borda da região em foco. Só rodam quando há
  // o que animar: o laço repinta o mapa a cada quadro e, ligado à toa, gasta bateria e nunca deixa
  // o mapa ficar ocioso.
  const animar = !menosMovimento && (subSelecionada != null || zonaEmFoco != null);
  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa || !animar) return;
    let quadro = 0;
    let ultimo = -1;
    const tique = (t: number) => {
      const passo = Math.floor(t / 70);
      if (passo !== ultimo && mapa.getLayer(SEL) && mapa.getLayer(BORDA)) {
        ultimo = passo;
        mapa.setPaintProperty(SEL, 'line-dasharray', PASSOS_TRACEJADO[passo % PASSOS_TRACEJADO.length]);
        const pulso = 0.8 + 0.2 * Math.sin((t / 1400) * 2 * Math.PI);
        mapa.setPaintProperty(BORDA, 'line-opacity', ['case', HOVER, 1, ['==', ['get', 'estado'], 'foco'], pulso, ['get', 'bordaOpacidade']]);
      }
      quadro = requestAnimationFrame(tique);
    };
    quadro = requestAnimationFrame(tique);
    return () => {
      cancelAnimationFrame(quadro);
      // Volta a borda ao valor fixo (o pulso deixou um número no lugar da expressão).
      if (mapa.getLayer(BORDA)) mapa.setPaintProperty(BORDA, 'line-opacity', OPACIDADE_BORDA);
    };
  }, [mapRef, animar]);

  return (
    <Source id={ID_FONTE_REGIOES} type="geojson" data={dados}>
      <Layer id={FILL} type="fill" beforeId={idPrimeiroSimbolo} paint={{ 'fill-color': ['get', 'fill'], 'fill-opacity': OPACIDADE_FILL }} />
      <Layer
        id={BORDA}
        type="line"
        beforeId={idPrimeiroSimbolo}
        filter={['!=', ['get', 'estado'], 'selecionada']}
        layout={{ 'line-join': 'round' }}
        paint={{
          'line-color': ['case', HOVER, 'rgba(255,255,255,0.6)', ['get', 'borda']],
          'line-opacity': OPACIDADE_BORDA,
          'line-width': ['case', HOVER, 2.5, ['get', 'peso']],
        }}
      />
      <Layer
        id={SEL}
        type="line"
        beforeId={idPrimeiroSimbolo}
        filter={['==', ['get', 'estado'], 'selecionada']}
        paint={{ 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] }}
      />
    </Source>
  );
}
