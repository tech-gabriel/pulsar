import type { FaixaRisco } from '../types';

export interface RiscoCores {
  bg: string;
  text: string;
  border: string;
  fill: string;       // cor para polígono Leaflet
  fillOpacity: number;
}

// Nota: bg/text/fill são usados também nos badges (tema claro) e têm testes.
// border/fillOpacity são exclusivos dos polígonos do mapa e foram calibrados
// para ficarem vibrantes sobre o basemap escuro (MapTiler Dataviz Dark).
const CORES: Record<FaixaRisco, RiscoCores> = {
  BAIXO: {
    bg: '#D4EDDA',
    text: '#155724',
    border: '#22c55e',
    fill: '#22c55e',
    fillOpacity: 0.25,
  },
  MODERADO: {
    bg: '#FFF3CD',
    text: '#856404',
    border: '#f59e0b',
    fill: '#f59e0b',
    fillOpacity: 0.35,
  },
  ALTO: {
    bg: '#F8D7DA',
    text: '#721C24',
    border: '#ef4444',
    fill: '#ef4444',
    fillOpacity: 0.45,
  },
};

const SEM_DADO: RiscoCores = {
  bg: '#F1F5F9',
  text: '#64748b',
  border: '#64748b',
  fill: '#94a3b8',
  fillOpacity: 0.2,
};

export function coresParaFaixa(faixa: FaixaRisco | null | undefined): RiscoCores {
  if (!faixa) return SEM_DADO;
  return CORES[faixa] ?? SEM_DADO;
}

export function labelFaixa(faixa: FaixaRisco | null | undefined): string {
  if (!faixa) return 'Sem dados';
  return { BAIXO: 'Baixo', MODERADO: 'Moderado', ALTO: 'Alto' }[faixa];
}

export function scoreFormatado(score: number | null | undefined): string {
  if (score == null) return '—';
  return score.toFixed(1);
}
