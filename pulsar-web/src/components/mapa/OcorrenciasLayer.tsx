import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { OcorrenciaAlagamentoDto } from '../../types';
import { iconeOcorrencia, formatarOcorrencia } from './ocorrenciaMarker';

interface Props {
  ocorrencias: OcorrenciaAlagamentoDto[];
}

/** Contrato mínimo do cluster do Leaflet.markercluster (sem @types do plugin). */
interface ClusterLike {
  getChildCount(): number;
}

/**
 * Bolha do cluster com os tokens do Pulsar. Sem isto o marcador herda o
 * `.marker-cluster` do plugin, que não tem CSS carregado no bundle e aparece
 * como um número solto sobre o mapa. O diâmetro cresce em três degraus e nunca
 * fica abaixo de 40px, mantendo o cluster confortável de tocar no mobile.
 */
function iconeCluster(cluster: ClusterLike): L.DivIcon {
  const total = cluster.getChildCount();
  const { d, fonte } =
    total < 10 ? { d: 40, fonte: 13 } : total < 50 ? { d: 46, fonte: 14 } : { d: 54, fonte: 15 };

  return L.divIcon({
    className: '',
    html: `<div class="pulsar-cluster" style="width:${d}px;height:${d}px;font-size:${fonte}px;">${total}</div>`,
    iconSize: L.point(d, d),
    iconAnchor: [d / 2, d / 2],
  });
}

/** Overlay clusterizado das ocorrências de alagamento. Renderizado dentro do MapContainer. */
export default function OcorrenciasLayer({ ocorrencias }: Props) {
  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={80} iconCreateFunction={iconeCluster}>
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
