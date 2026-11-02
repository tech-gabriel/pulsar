import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Popup, Source, useMap } from 'react-map-gl/maplibre';
import type { GeoJSONSource, Map as MapaMapLibre, MapLayerMouseEvent } from 'maplibre-gl';
import type { OcorrenciaAlagamentoDto } from '../../types';
import { formatarOcorrencia, LADO_ICONE, ocorrenciasGeojson, svgOcorrencia } from './ocorrenciaMarker';

const FONTE = 'pulsar-ocorr';
const CLUSTER = 'pulsar-ocorr-cluster';
const CONTAGEM = 'pulsar-ocorr-contagem';
const PONTO = 'pulsar-ocorr-ponto';
const TIPOS: OcorrenciaAlagamentoDto['tipo'][] = ['ALAGAMENTO', 'INUNDACAO'];
const ESCALA = 2; // ícone rasterizado a 2x para ficar nítido em tela de alta densidade
// Bolha com a mesma cor da .pulsar-cluster (blue-700, o azulProfundo da paleta, a 94%).
const COR_BOLHA = 'rgba(29, 78, 216, 0.94)';

const idImagem = (tipo: OcorrenciaAlagamentoDto['tipo']) => `ocorrencia-${tipo}`;

/** Registra os dois ícones no estilo atual. Trocar de estilo (tema) apaga as imagens: chamar de novo. */
async function garantirImagens(mapa: MapaMapLibre) {
  await Promise.all(
    TIPOS.filter((t) => !mapa.hasImage(idImagem(t))).map(
      (tipo) =>
        new Promise<void>((pronto) => {
          const img = new Image(LADO_ICONE * ESCALA, LADO_ICONE * ESCALA);
          img.onload = () => {
            if (!mapa.hasImage(idImagem(tipo))) mapa.addImage(idImagem(tipo), img, { pixelRatio: ESCALA });
            pronto();
          };
          img.onerror = () => pronto();
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOcorrencia(tipo))}`;
        }),
    ),
  );
}

/** Alagamentos e inundações dos últimos 12 meses, agrupados. Por cima de tudo, como antes. */
export default function OcorrenciasLayer({ ocorrencias }: { ocorrencias: OcorrenciaAlagamentoDto[] }) {
  const { current: mapRef } = useMap();
  const dados = useMemo(() => ocorrenciasGeojson(ocorrencias), [ocorrencias]);
  const porId = useMemo(() => new Map(ocorrencias.map((o) => [o.id, o])), [ocorrencias]);
  const [aberta, setAberta] = useState<OcorrenciaAlagamentoDto | null>(null);
  // Handlers registrados uma vez só leem o mapa por id atual.
  const porIdRef = useRef(porId);
  useEffect(() => {
    porIdRef.current = porId;
  });

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const registrar = () => void garantirImagens(mapa);
    registrar();
    mapa.on('styledata', registrar);

    const clicarBolha = async (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const fonte = mapa.getSource(FONTE) as GeoJSONSource | undefined;
      const zoom = await fonte?.getClusterExpansionZoom(f.properties?.cluster_id as number);
      if (zoom == null || f.geometry.type !== 'Point') return;
      mapa.easeTo({ center: f.geometry.coordinates as [number, number], zoom });
    };
    const clicarPonto = (e: MapLayerMouseEvent) => {
      const o = porIdRef.current.get(String(e.features?.[0]?.properties?.id));
      if (o) setAberta(o);
    };
    const ponteiro = () => (mapa.getCanvas().style.cursor = 'pointer');
    const solto = () => (mapa.getCanvas().style.cursor = '');

    mapa.on('click', CLUSTER, clicarBolha);
    mapa.on('click', PONTO, clicarPonto);
    for (const id of [CLUSTER, PONTO]) {
      mapa.on('mouseenter', id, ponteiro);
      mapa.on('mouseleave', id, solto);
    }
    return () => {
      mapa.off('styledata', registrar);
      mapa.off('click', CLUSTER, clicarBolha);
      mapa.off('click', PONTO, clicarPonto);
      for (const id of [CLUSTER, PONTO]) {
        mapa.off('mouseenter', id, ponteiro);
        mapa.off('mouseleave', id, solto);
      }
    };
  }, [mapRef]);

  const info = aberta ? formatarOcorrencia(aberta) : null;

  return (
    <>
      <Source id={FONTE} type="geojson" data={dados} cluster clusterRadius={80} clusterMaxZoom={15}>
        <Layer
          id={CLUSTER}
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': COR_BOLHA,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.92)',
            'circle-stroke-width': 2,
            // Diâmetros 40, 46 e 54 px (menos de 10, menos de 50, mais), nunca abaixo de 40 para o toque.
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 23, 50, 27],
          }}
        />
        <Layer
          id={CONTAGEM}
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Noto Sans Bold'],
            'text-size': ['step', ['get', 'point_count'], 13, 10, 14, 50, 15],
            'text-allow-overlap': true,
          }}
          paint={{ 'text-color': '#ffffff' }}
        />
        <Layer
          id={PONTO}
          type="symbol"
          filter={['!', ['has', 'point_count']]}
          layout={{ 'icon-image': ['concat', 'ocorrencia-', ['get', 'tipo']], 'icon-allow-overlap': true }}
        />
      </Source>
      {aberta && info && (
        <Popup longitude={aberta.longitude} latitude={aberta.latitude} offset={16} closeButton={false} onClose={() => setAberta(null)} className="pulsar-popup-ocorrencia">
          <div style={{ fontSize: 12 }}>
            <strong>{info.titulo}</strong>
            <div>{info.data}</div>
            {info.subprefeitura && <div style={{ opacity: 0.8 }}>{info.subprefeitura}</div>}
          </div>
        </Popup>
      )}
    </>
  );
}
