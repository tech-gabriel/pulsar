import { useEffect, useRef, useState } from 'react';
import Map, { AttributionControl, Layer, Marker, Source, type MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import maplibregl from './maplibre';
import { carregarEstiloBase, comChaveMapTiler, urlReservaMapTiler } from './estiloBase';
import { circuloGeojson, paddingDoPainel } from './geometria';
import { ZOOM } from './zoom';
import ZoomControles from './ZoomControles';
import RegioesLayer from './RegioesLayer';
import ScoreLabel from './ScoreLabel';
import type { FeatureCollection } from 'geojson';
import { centroideRegiao } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { PropsMapa } from './MapaBase';

const SP: [number, number] = [-46.6333, -23.5505]; // lon, lat
const ESPERA_ESTILO_MS = 8000;
const CHAVE_MAPTILER = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const COR_BUSCA = '#00BCFF';

/** Pin da busca: o mesmo SVG de antes do MapLibre. */
function PinBusca() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={COR_BUSCA} stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
    </svg>
  );
}

/** Primeiro rótulo do estilo base: as camadas do Pulsar entram antes dele (nomes por cima do risco). */
function primeiroSimbolo(mapa: maplibregl.Map): string | undefined {
  return mapa.getStyle()?.layers.find((l) => l.type === 'symbol' && !l.id.startsWith('pulsar-'))?.id;
}

export default function MapaGL(props: PropsMapa) {
  const { geojson, subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva, zonaEmFoco, subSelecionadaAtiva, pontoBusca, onMoverPonto, overlayAlagamento } = props;
  const { theme } = useTheme();
  const isMobile = useIsMobile(768);
  const mapRef = useRef<MapRef>(null);
  const [estiloOfm, setEstiloOfm] = useState<StyleSpecification | null>(null);
  const [reserva, setReserva] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [idPrimeiroSimbolo, setIdPrimeiroSimbolo] = useState<string | undefined>();
  const estilo = reserva ? (CHAVE_MAPTILER ? urlReservaMapTiler(theme, CHAVE_MAPTILER) : null) : estiloOfm;

  // Estilo base do tema; se o OpenFreeMap falhar, a reserva do MapTiler vale até sair do mapa.
  useEffect(() => {
    if (reserva) return;
    const abortar = new AbortController();
    carregarEstiloBase(theme, abortar.signal)
      .then(setEstiloOfm)
      .catch((e: unknown) => {
        if (!abortar.signal.aborted && (e as Error)?.name !== 'AbortError') setReserva(true);
      });
    return () => abortar.abort();
  }, [theme, reserva]);

  // Só na abertura: sem `load` em 8 s, cai para a reserva.
  useEffect(() => {
    if (carregou) return;
    const t = window.setTimeout(() => setReserva(true), ESPERA_ESTILO_MS);
    return () => window.clearTimeout(t);
  }, [carregou]);

  function voar(lonLat: [number, number], zoom: number, duracaoMs: number) {
    const mapa = mapRef.current;
    if (!mapa) return;
    mapa.flyTo({ center: lonLat, zoom, duration: duracaoMs, padding: paddingDoPainel(mapa.getContainer()) });
  }

  // Seleção vinda de clique no mapa: o próprio clique já voou para a subprefeitura.
  const subSelRef = useRef(subSelecionadaAtiva);
  useEffect(() => {
    subSelRef.current = subSelecionadaAtiva;
  });

  useEffect(() => {
    if (!carregou) return;
    if (!zonaEmFoco) {
      voar(SP, ZOOM.sp, 600);
      return;
    }
    if (subSelRef.current) return;
    const centro = centroideRegiao(subprefeituras.filter((s) => normalizarNome(s.zona) === normalizarNome(zonaEmFoco)));
    if (centro) voar([centro.lon, centro.lat], ZOOM.regiao, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonaEmFoco, carregou]);

  // A subprefeitura escolhida na lista, na busca ou no sino vira o foco do mapa.
  useEffect(() => {
    if (carregou && subSelecionada) voar([subSelecionada.longitude, subSelecionada.latitude], ZOOM.sub, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSelecionada?.id, carregou]);

  // Resultado da busca ou "minha região": voa até o ponto; com precisão, enquadra o círculo inteiro.
  useEffect(() => {
    const mapa = mapRef.current;
    if (!carregou || !mapa || !pontoBusca || pontoBusca.ajustado) return;
    if (pontoBusca.precisao !== undefined) {
      const anel = circuloGeojson(pontoBusca.lat, pontoBusca.lon, pontoBusca.precisao).geometry.coordinates[0];
      const lons = anel.map(([lon]) => lon);
      const lats = anel.map(([, lat]) => lat);
      mapa.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
        maxZoom: ZOOM.busca, duration: 800, padding: paddingDoPainel(mapa.getContainer()),
      });
    } else {
      voar([pontoBusca.lon, pontoBusca.lat], ZOOM.busca, 800);
    }
     
  }, [pontoBusca, carregou]);

  if (!estilo) return <div className="w-full h-full" style={{ background: 'var(--bg-primary)' }} />;

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={estilo}
      initialViewState={{ longitude: SP[0], latitude: SP[1], zoom: ZOOM.sp }}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      transformRequest={reserva && CHAVE_MAPTILER ? (url) => ({ url: comChaveMapTiler(url, CHAVE_MAPTILER) }) : undefined}
      onLoad={(e) => {
        setCarregou(true);
        setIdPrimeiroSimbolo(primeiroSimbolo(e.target));
        e.target.once('idle', () => performance.mark('mapa-pronto'));
      }}
      onStyleData={(e) => setIdPrimeiroSimbolo(primeiroSimbolo(e.target))}
    >
      <ZoomControles lado={isMobile ? 'direita' : 'esquerda'} />
      <AttributionControl compact position="bottom-right" />

      {geojson && carregou && (
        <>
          <RegioesLayer
            geojson={geojson as FeatureCollection}
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            onSelecionarSub={onSelecionarSub}
            camadaAtiva={camadaAtiva}
            zonaEmFoco={zonaEmFoco}
            idPrimeiroSimbolo={idPrimeiroSimbolo}
          />
          <ScoreLabel
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            camadaAtiva={camadaAtiva}
            zonaEmFoco={zonaEmFoco}
            atenuado={overlayAlagamento}
          />
        </>
      )}

      {pontoBusca?.precisao !== undefined && (
        <Source id="pulsar-precisao" type="geojson" data={circuloGeojson(pontoBusca.lat, pontoBusca.lon, pontoBusca.precisao)}>
          <Layer id="pulsar-precisao-fill" type="fill" paint={{ 'fill-color': COR_BUSCA, 'fill-opacity': 0.12 }} />
          <Layer id="pulsar-precisao-linha" type="line" paint={{ 'line-color': COR_BUSCA, 'line-width': 1 }} />
        </Source>
      )}
      {pontoBusca && (
        <Marker
          longitude={pontoBusca.lon}
          latitude={pontoBusca.lat}
          anchor="bottom"
          draggable
          onDragEnd={(e) => onMoverPonto(e.lngLat.lat, e.lngLat.lng)}
        >
          <div title="Arraste para ajustar o ponto">
            <PinBusca />
          </div>
        </Marker>
      )}
    </Map>
  );
}
