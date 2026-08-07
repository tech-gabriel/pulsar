import type { FaixaRisco } from '../types';
import { PALETA, comAlfa } from './paleta';

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
// As cores de leitura saem de utils/paleta.ts; bg/text são os pastéis dos
// badges no tema claro e não pertencem à paleta do mapa.
const CORES: Record<FaixaRisco, RiscoCores> = {
  BAIXO: {
    bg: '#D4EDDA',
    text: '#155724',
    border: PALETA.verde,
    fill: PALETA.verde,
    fillOpacity: 0.25,
  },
  MODERADO: {
    bg: '#FFF3CD',
    text: '#856404',
    border: PALETA.ambar,
    fill: PALETA.ambar,
    fillOpacity: 0.35,
  },
  ALTO: {
    bg: '#F8D7DA',
    text: '#721C24',
    border: PALETA.vermelho,
    fill: PALETA.vermelho,
    fillOpacity: 0.45,
  },
};

const SEM_DADO: RiscoCores = {
  bg: '#F1F5F9',
  text: '#64748b',
  border: '#64748b',
  fill: PALETA.neutro,
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

// ── Estilo dos polígonos no tema dark (ETAPA 2.3) ──────────────────────────────
// Valores exatos da especificação: vibrantes sobre o basemap escuro.
export interface EstiloPoligono {
  fillColor: string;
  fillOpacity: number;
  color: string;      // borda
  opacity: number;    // opacidade da borda
  weight: number;
}

const ESTILO_POLIGONO: Record<FaixaRisco, EstiloPoligono> = {
  BAIXO:    { fillColor: PALETA.verde,    fillOpacity: 0.25, color: PALETA.verde,    opacity: 0.5, weight: 1.5 },
  MODERADO: { fillColor: PALETA.amarelo,  fillOpacity: 0.3,  color: PALETA.amarelo,  opacity: 0.5, weight: 1.5 },
  ALTO:     { fillColor: PALETA.vermelho, fillOpacity: 0.35, color: PALETA.vermelho, opacity: 0.6, weight: 2 },
};

const ESTILO_POLIGONO_SEM_DADO: EstiloPoligono = {
  fillColor: PALETA.neutro, fillOpacity: 0.15, color: PALETA.neutro, opacity: 0.3, weight: 1,
};

export function estiloPoligono(faixa: FaixaRisco | null | undefined): EstiloPoligono {
  if (!faixa) return ESTILO_POLIGONO_SEM_DADO;
  return ESTILO_POLIGONO[faixa] ?? ESTILO_POLIGONO_SEM_DADO;
}

// ── Cor de fundo do label de score circular (ETAPA 2.4) ────────────────────────
const COR_LABEL: Record<FaixaRisco, string> = {
  BAIXO:    comAlfa(PALETA.verde, 0.85),
  MODERADO: comAlfa(PALETA.amarelo, 0.85),
  ALTO:     comAlfa(PALETA.vermelho, 0.85),
};
const COR_LABEL_SEM_DADO = comAlfa(PALETA.neutro, 0.85);

export function corLabelFaixa(faixa: FaixaRisco | null | undefined): string {
  if (!faixa) return COR_LABEL_SEM_DADO;
  return COR_LABEL[faixa] ?? COR_LABEL_SEM_DADO;
}
