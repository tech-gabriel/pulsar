import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { OcorrenciaAlagamentoDto } from '../../types';
import { iconeOcorrencia, formatarOcorrencia } from './ocorrenciaMarker';

interface Props {
  ocorrencias: OcorrenciaAlagamentoDto[];
}

/** Overlay clusterizado das ocorrências de alagamento. Renderizado dentro do MapContainer. */
export default function OcorrenciasLayer({ ocorrencias }: Props) {
  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
      {ocorrencias.map((o) => {
        const info = formatarOcorrencia(o);
        return (
          <Marker key={o.id} position={[o.latitude, o.longitude]} icon={iconeOcorrencia(o.tipo)}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{info.titulo}</strong>
                <div>{info.data}</div>
                {info.subprefeitura && <div style={{ opacity: 0.8 }}>{info.subprefeitura}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
