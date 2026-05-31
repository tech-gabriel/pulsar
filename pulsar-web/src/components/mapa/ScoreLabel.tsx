import { useState } from 'react';
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { tooltipSubprefeituraHtml } from './tooltipSub';

interface Props {
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
}

interface TamanhoLabel {
  diametro: number;
  fonte: number;
}

// Comportamento de zoom (ETAPA 2.7):
//  zoom <= 10  → esconder (null);  11-12 → 32px/11px;  >= 13 → 38px/13px.
function tamanhoParaZoom(zoom: number): TamanhoLabel | null {
  if (zoom <= 10) return null;
  if (zoom <= 12) return { diametro: 32, fonte: 11 };
  return { diametro: 38, fonte: 13 };
}

// Extrai a opacidade de uma cor rgba(...) para montar o glow (alpha ~0.4).
function glowDaCor(cor: string): string {
  return cor.replace(/[\d.]+\)$/, '0.5)');
}

export default function ScoreLabel({ subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const tamanho = tamanhoParaZoom(zoom);
  if (!tamanho) return null; // mapa muito afastado: esconde os labels

  const { diametro, fonte } = tamanho;

  return (
    <>
      {subprefeituras.map((sub) => {
        const estilo = estiloCamada(sub, camadaAtiva);
        const glow = glowDaCor(estilo.corCirculo);
        const selecionada = subSelecionada?.id === sub.id;

        const classes = [
          'pulsar-score-circle',
          estilo.pulsa ? 'pulsa' : '',
          selecionada ? 'selecionado' : '',
        ].filter(Boolean).join(' ');

        const icon = L.divIcon({
          className: 'pulsar-score-label',
          iconSize: [0, 0],
          html: `<div class="${classes}" style="width:${diametro}px;height:${diametro}px;font-size:${fonte}px;background:${estilo.corCirculo};box-shadow:0 0 10px ${glow};">${estilo.texto}</div>`,
        });

        return (
          // key inclui a camada → re-monta o marker ao trocar de camada,
          // disparando a animação de fade (ETAPA 3.3).
          <Marker
            key={`${sub.id}-${camadaAtiva}`}
            position={[sub.latitude, sub.longitude]}
            icon={icon}
            keyboard={false}
            eventHandlers={{
              click: () => {
                onSelecionarSub(sub);
                map.flyTo([sub.latitude, sub.longitude], 13, { duration: 0.6 });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -diametro / 2]} className="pulsar-tooltip" opacity={1}>
              <div dangerouslySetInnerHTML={{ __html: tooltipSubprefeituraHtml(sub, sub.nome, camadaAtiva) }} />
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
