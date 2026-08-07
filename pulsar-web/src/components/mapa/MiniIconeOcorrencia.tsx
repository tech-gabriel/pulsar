import type { OcorrenciaAlagamentoDto } from '../../types';
import { DISCO, GLIFO, LADO_DESENHO, corOcorrencia } from './ocorrenciaMarker';

interface Props {
  tipo: OcorrenciaAlagamentoDto['tipo'];
  lado?: number;
}

/**
 * Miniatura do marcador de ocorrência, para a legenda do mapa. Desenha a partir
 * dos mesmos dados que o divIcon do Leaflet usa, então a legenda não pode
 * divergir do que aparece no mapa — e sai como JSX, sem innerHTML.
 */
export default function MiniIconeOcorrencia({ tipo, lado = 16 }: Props) {
  const glifo = GLIFO[tipo];

  return (
    <svg
      width={lado}
      height={lado}
      viewBox={`0 0 ${LADO_DESENHO} ${LADO_DESENHO}`}
      aria-hidden
      focusable="false"
    >
      <circle
        cx={DISCO.cx}
        cy={DISCO.cy}
        r={DISCO.r}
        fill={corOcorrencia(tipo)}
        stroke="#ffffff"
        strokeWidth={DISCO.traco}
      />
      <g
        fill={glifo.pintura === 'fill' ? '#ffffff' : 'none'}
        stroke={glifo.pintura === 'stroke' ? '#ffffff' : undefined}
        strokeWidth={glifo.espessura}
        strokeLinecap="round"
      >
        {glifo.caminhos.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
