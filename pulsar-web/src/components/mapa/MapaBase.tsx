import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import type { RegiaoDto } from '../../types';
import RegioesLayer from './RegioesLayer';

// Centro geográfico de São Paulo
const SP_CENTER: [number, number] = [-23.5505, -46.6333];
const SP_ZOOM = 10;

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={0.7}
      />
      {geojson && (
        <RegioesLayer
          geojson={geojson}
          regioes={regioes}
          regiaoSelecionada={regiaoSelecionada}
          onSelecionarRegiao={onSelecionarRegiao}
        />
      )}
    </MapContainer>
  );
}
