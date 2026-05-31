import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import type { SubprefeituraMapaDto } from '../../types';
import type { Camada } from '../../utils/camadas';
import RegioesLayer from './RegioesLayer';
import ScoreLabel from './ScoreLabel';

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
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
}

export default function MapaBase({ geojson, subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva }: Props) {
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
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            onSelecionarSub={onSelecionarSub}
            camadaAtiva={camadaAtiva}
          />
          <ScoreLabel
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            onSelecionarSub={onSelecionarSub}
            camadaAtiva={camadaAtiva}
          />
        </>
      )}
    </MapContainer>
  );
}
