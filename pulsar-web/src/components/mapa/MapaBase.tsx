import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import type { SubprefeituraMapaDto } from '../../types';
import type { Camada } from '../../utils/camadas';
import { centroideRegiao } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { useTheme } from '../../hooks/useTheme';
import RegioesLayer from './RegioesLayer';
import ScoreLabel from './ScoreLabel';

// Centro geográfico de São Paulo
const SP_CENTER: [number, number] = [-23.5505, -46.6333];
const SP_ZOOM = 10;

// Tile layer: MapTiler (dataviz dark/light) se houver key; senão, fallback CartoDB.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const ATTRIB_MAPTILER = '© MapTiler © OpenStreetMap contributors';
const ATTRIB_CARTO =
  '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function tileConfig(theme: 'dark' | 'light') {
  if (MAPTILER_KEY) {
    const estilo = theme === 'light' ? 'dataviz-light' : 'dataviz-dark';
    return { url: `https://api.maptiler.com/maps/${estilo}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, attribution: ATTRIB_MAPTILER };
  }
  const base = theme === 'light' ? 'light_all' : 'dark_all';
  return { url: `https://basemaps.cartocdn.com/${base}/{z}/{x}/{y}{r}.png`, attribution: ATTRIB_CARTO };
}

interface Props {
  geojson: GeoJsonObject | null;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
  regiaoSelecionadaNome: string | null;
  subSelecionadaAtiva: boolean;
}

/**
 * Centraliza o mapa na região selecionada (ETAPA 4.7). Quando a seleção parte
 * de um clique no mapa (subSelecionadaAtiva), o próprio handler já faz o flyTo
 * para a subprefeitura, então aqui só agimos quando a seleção vem da lista.
 * Sem região selecionada, volta ao enquadramento padrão de SP.
 */
function MapController({
  subprefeituras,
  regiaoSelecionadaNome,
  subSelecionadaAtiva,
}: {
  subprefeituras: SubprefeituraMapaDto[];
  regiaoSelecionadaNome: string | null;
  subSelecionadaAtiva: boolean;
}) {
  const map = useMap();
  const subSelRef = useRef(subSelecionadaAtiva);
  useEffect(() => {
    subSelRef.current = subSelecionadaAtiva;
  });

  useEffect(() => {
    if (!regiaoSelecionadaNome) {
      map.flyTo(SP_CENTER, SP_ZOOM, { duration: 0.6 });
      return;
    }
    if (subSelRef.current) return; // clique no mapa já centralizou na subprefeitura
    const daRegiao = subprefeituras.filter(
      (s) => normalizarNome(s.regiaoNome) === normalizarNome(regiaoSelecionadaNome),
    );
    const centro = centroideRegiao(daRegiao);
    if (centro) map.flyTo([centro.lat, centro.lon], 11, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regiaoSelecionadaNome]);

  return null;
}

export default function MapaBase({
  geojson,
  subprefeituras,
  subSelecionada,
  onSelecionarSub,
  camadaAtiva,
  regiaoSelecionadaNome,
  subSelecionadaAtiva,
}: Props) {
  const { theme } = useTheme();
  const tile = tileConfig(theme);
  return (
    <MapContainer
      center={SP_CENTER}
      zoom={SP_ZOOM}
      className="w-full h-full"
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        key={tile.url}
        attribution={tile.attribution}
        url={tile.url}
      />
      <MapController
        subprefeituras={subprefeituras}
        regiaoSelecionadaNome={regiaoSelecionadaNome}
        subSelecionadaAtiva={subSelecionadaAtiva}
      />
      {geojson && (
        <>
          <RegioesLayer
            geojson={geojson}
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            onSelecionarSub={onSelecionarSub}
            camadaAtiva={camadaAtiva}
            regiaoSelecionadaNome={regiaoSelecionadaNome}
          />
          <ScoreLabel
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            camadaAtiva={camadaAtiva}
            regiaoSelecionadaNome={regiaoSelecionadaNome}
          />
        </>
      )}
    </MapContainer>
  );
}
