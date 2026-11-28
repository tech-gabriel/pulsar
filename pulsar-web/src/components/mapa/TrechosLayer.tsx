import { useEffect, useMemo, useRef } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { PropsTrecho } from '../../features/cidade/trechos';
import { usePrefereMenosMovimento } from '../../hooks/usePrefereMenosMovimento';
import { useTheme } from '../../hooks/useTheme';
import { deslocamentoDoPainel, paddingDoPainel } from './geometria';
import { ZOOM, ZOOM_TRECHOS } from './zoom';
import { CAMADAS_TOQUE_POR_CIMA } from './camadasPorCima';

export const ID_TRECHOS_FILL = 'pulsar-trechos-fill';
const PONTO = 'pulsar-trechos-ponto';
/** Alagamentos por cima: o toque neles não abre o trecho de baixo. */
const CAMADAS_POR_CIMA = CAMADAS_TOQUE_POR_CIMA;

const { de } = ZOOM_TRECHOS;

interface Props {
  dados: FeatureCollection<Polygon, PropsTrecho>;
  /** Trecho aberto no detalhe: vira um ponto no centro. */
  selecionado: string | null;
  /** Sem ele (rota aberta) os trechos só mostram o risco: não abrem o detalhe nem mudam o cursor. */
  onTocar?: (h3: string) => void;
  idPrimeiroSimbolo: string | undefined;
}

/**
 * Os trechos da cidade pintados pelo risco de agora. Só aparecem de perto (a partir de
 * ZOOM_TRECHOS.de); de longe quem fala são as áreas. Tocar num trecho abre o detalhe dele.
 */
export default function TrechosLayer({ dados, selecionado, onTocar, idPrimeiroSimbolo }: Props) {
  const { current: mapRef } = useMap();
  const menosMovimento = usePrefereMenosMovimento();
  const escuro = useTheme().theme === 'dark';
  const corPonto = escuro ? '#ffffff' : '#0F172A';
  const corBorda = escuro ? '#0F172A' : '#ffffff';
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
      const tocar = onTocarRef.current;
      if (!tocar || typeof h3 !== 'string' || alagamentoNoPonto(e)) return;
      tocar(h3);
      // Fica no zoom em que a pessoa está (aproximou para ver a rua); só garante o do detalhe.
      mapa.easeTo({
        center: e.lngLat,
        zoom: Math.max(mapa.getZoom(), ZOOM.sub),
        duration: menosMovimentoRef.current ? 0 : 500,
        offset: deslocamentoDoPainel(paddingDoPainel(mapa.getContainer())),
      });
    };
    const entrar = () => { if (onTocarRef.current) mapa.getCanvas().style.cursor = 'pointer'; };
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

  // O trecho tocado vira um ponto no centro do hexágono (média dos vértices, sem o de fechamento).
  const ponto = useMemo<FeatureCollection<Point>>(() => {
    const anel = dados.features.find((f) => f.properties.h3 === selecionado)?.geometry.coordinates[0]?.slice(0, -1) ?? [];
    const features: Feature<Point>[] = anel.length === 0 ? [] : [{
      type: 'Feature', properties: {},
      geometry: { type: 'Point', coordinates: [anel.reduce((t, c) => t + c[0], 0) / anel.length, anel.reduce((t, c) => t + c[1], 0) / anel.length] },
    }];
    return { type: 'FeatureCollection', features };
  }, [dados, selecionado]);

  return (
    <>
    <Source id="pulsar-trechos" type="geojson" data={dados}>
      <Layer id={ID_TRECHOS_FILL} type="fill" minzoom={de} beforeId={idPrimeiroSimbolo}
        paint={{ 'fill-color': '#000000', 'fill-opacity': 0 }} />
    </Source>
    <Source id="pulsar-trechos-ponto" type="geojson" data={ponto}>
      <Layer id={PONTO} type="circle" minzoom={de}
        paint={{ 'circle-radius': 6, 'circle-color': corPonto, 'circle-stroke-width': 2, 'circle-stroke-color': corBorda }} />
    </Source>
    </>
  );
}
