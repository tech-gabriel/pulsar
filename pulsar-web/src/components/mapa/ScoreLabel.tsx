import { useState } from 'react';
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SubprefeituraMapaDto } from '../../types';
import { corLabelFaixa } from '../../utils/risco';
import { tooltipSubprefeituraHtml } from './tooltipSub';

interface Props {
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
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

export default function ScoreLabel({ subprefeituras, subSelecionada, onSelecionarSub }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const tamanho = tamanhoParaZoom(zoom);
  if (!tamanho) return null; // mapa muito afastado: esconde os labels

  const { diametro, fonte } = tamanho;

  return (
    <>
      {subprefeituras.map((sub) => {
        const valor = sub.scoreAtual?.valor;
        const cor = corLabelFaixa(sub.faixaRisco);
        const glow = cor.replace('0.85', '0.4');
        const pulsa = (valor ?? 0) > 60;
        const selecionada = subSelecionada?.id === sub.id;

        const classes = [
          'pulsar-score-circle',
          pulsa ? 'pulsa' : '',
          selecionada ? 'selecionado' : '',
        ].filter(Boolean).join(' ');

        const texto = valor != null ? String(Math.round(valor)) : '—';

        const icon = L.divIcon({
          className: 'pulsar-score-label',
          iconSize: [0, 0],
          html: `<div class="${classes}" style="width:${diametro}px;height:${diametro}px;font-size:${fonte}px;background:${cor};box-shadow:0 0 10px ${glow};">${texto}</div>`,
        });

        return (
          <Marker
            key={sub.id}
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
              <div dangerouslySetInnerHTML={{ __html: tooltipSubprefeituraHtml(sub, sub.nome) }} />
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
