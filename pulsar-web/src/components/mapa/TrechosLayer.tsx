import { useEffect, useRef } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';
import type { FeatureCollection, Polygon } from 'geojson';
import type { ExpressionSpecification, MapLayerMouseEvent } from 'maplibre-gl';
import type { PropsTrecho } from '../../features/cidade/trechos';
import { usePrefereMenosMovimento } from '../../hooks/usePrefereMenosMovimento';
import { useTheme } from '../../hooks/useTheme';
import { TOM_CLARO, TOM_ESCURO } from './estiloBase';
import { deslocamentoDoPainel, paddingDoPainel } from './geometria';
import { ZOOM, ZOOM_TRECHOS } from './zoom';

export const ID_TRECHOS_FILL = 'pulsar-trechos-fill';
const LINHA = 'pulsar-trechos-linha';
const SEL = 'pulsar-trechos-sel';
/** Alagamentos por cima: o toque neles não abre o trecho de baixo. */
const CAMADAS_POR_CIMA = ['pulsar-ocorr-cluster', 'pulsar-ocorr-ponto'];

const { de, ate } = ZOOM_TRECHOS;
// Surge no mesmo intervalo em que as áreas somem (opção B escolhida em 13/11). Perto da rua o
// preenchimento cai para 60%, para os nomes e o traçado continuarem legíveis.
const OPACIDADE: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], de, 0, ate, ['get', 'opacidade'], 15, ['*', ['get', 'opacidade'], 0.6]];
const LARGURA_LINHA: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 9, 0.15, 13, 1];
// A linha entre os trechos tem a cor do chão do mapa (rejunte, escolhido em 15/11): separa sem
// competir com a cor do risco e deixa o contorno branco do trecho tocado como o único traço claro.
const OPACIDADE_LINHA: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], de, 0, ate, 0.9];

interface Props {
  dados: FeatureCollection<Polygon, PropsTrecho>;
  /** Trecho aberto no detalhe: ganha o contorno forte. */
  selecionado: string | null;
  onTocar: (h3: string) => void;
  idPrimeiroSimbolo: string | undefined;
}

/**
 * Os trechos da cidade pintados pelo risco de agora. Só aparecem de perto (a partir de
 * ZOOM_TRECHOS.de); de longe quem fala são as áreas. Tocar num trecho abre o detalhe dele.
 */
export default function TrechosLayer({ dados, selecionado, onTocar, idPrimeiroSimbolo }: Props) {
  const { current: mapRef } = useMap();
  const menosMovimento = usePrefereMenosMovimento();
  const corLinha = (useTheme().theme === 'dark' ? TOM_ESCURO : TOM_CLARO).chao;
  const onTocarRef = useRef(onTocar);
  const menosMovimentoRef = useRef(menosMovimento);
  useEffect(() => {
    onTocarRef.current = onTocar;
    menosMovimentoRef.current = menosMovimento;
  });

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const alagamentoNoPonto = (e: MapLayerMouseEvent) => {
      const porCima = CAMADAS_POR_CIMA.filter((id) => mapa.getLayer(id));
      return porCima.length > 0 && mapa.queryRenderedFeatures(e.point, { layers: porCima }).length > 0;
    };
    const clicar = (e: MapLayerMouseEvent) => {
      const h3 = e.features?.[0]?.properties?.h3;
      if (typeof h3 !== 'string' || alagamentoNoPonto(e)) return;
      onTocarRef.current(h3);
      // Fica no zoom em que a pessoa está (aproximou para ver a rua); só garante o do detalhe.
      mapa.easeTo({
        center: e.lngLat,
        zoom: Math.max(mapa.getZoom(), ZOOM.sub),
        duration: menosMovimentoRef.current ? 0 : 500,
        offset: deslocamentoDoPainel(paddingDoPainel(mapa.getContainer())),
      });
    };
    const entrar = () => { mapa.getCanvas().style.cursor = 'pointer'; };
    const sair = () => { mapa.getCanvas().style.cursor = ''; };
    mapa.on('click', ID_TRECHOS_FILL, clicar);
    mapa.on('mouseenter', ID_TRECHOS_FILL, entrar);
    mapa.on('mouseleave', ID_TRECHOS_FILL, sair);
    return () => {
      mapa.off('click', ID_TRECHOS_FILL, clicar);
      mapa.off('mouseenter', ID_TRECHOS_FILL, entrar);
      mapa.off('mouseleave', ID_TRECHOS_FILL, sair);
    };
  }, [mapRef]);

  return (
    <Source id="pulsar-trechos" type="geojson" data={dados}>
      <Layer id={ID_TRECHOS_FILL} type="fill" minzoom={de} beforeId={idPrimeiroSimbolo}
        paint={{ 'fill-color': ['get', 'cor'], 'fill-opacity': OPACIDADE }} />
      <Layer id={LINHA} type="line" minzoom={de} beforeId={idPrimeiroSimbolo}
        paint={{ 'line-color': corLinha, 'line-width': LARGURA_LINHA, 'line-opacity': OPACIDADE_LINHA }} />
      <Layer id={SEL} type="line" minzoom={de} beforeId={idPrimeiroSimbolo}
        filter={['==', ['get', 'h3'], selecionado ?? '']}
        layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': '#ffffff', 'line-width': 3 }} />
    </Source>
  );
}
