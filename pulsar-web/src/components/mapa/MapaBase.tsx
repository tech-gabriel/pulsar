import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import type { RegiaoDto } from '../../types';
import RegioesLayer from './RegioesLayer';
import ScoreLabels from './ScoreLabels';

// Centro geográfico de São Paulo
const SP_CENTER: [number, number] = [-23.5505, -46.6333];
const SP_ZOOM = 10;

// Tile layer: MapTiler Dataviz Dark se houver key; senão, fallback CartoDB Dark Matter.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

const TILE_CONFIG = MAPTILER_KEY
  ? {
      url: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      attribution: '© MapTiler © OpenStreetMap contributors',
    }
  : {
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };

interface Props {
  geojson: GeoJsonObject | null;
  regioes: RegiaoDto[];
  regiaoSelecionada: string | null;
  onSelecionarRegiao: (nome: string) => void;
}

export default function MapaBase({ geojson, regioes, regiaoSelecionada, onSelecionarRegiao }: Props) {
  return (
    <MapContainer
      center={SP_CENTER}
      zoom={SP_ZOOM}
      className="w-full h-full"
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        key={TILE_CONFIG.url}
        attribution={TILE_CONFIG.attribution}
        url={TILE_CONFIG.url}
      />
      {geojson && (
        <>
          <RegioesLayer
            geojson={geojson}
            regioes={regioes}
            regiaoSelecionada={regiaoSelecionada}
            onSelecionarRegiao={onSelecionarRegiao}
          />
          <ScoreLabels
            geojson={geojson}
            regioes={regioes}
            onSelecionarRegiao={onSelecionarRegiao}
          />
        </>
      )}
    </MapContainer>
  );
}
