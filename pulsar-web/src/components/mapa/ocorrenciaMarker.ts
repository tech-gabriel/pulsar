import L from 'leaflet';
import type { OcorrenciaAlagamentoDto } from '../../types';

// Cores por tipo (distintas das camadas de score).
const COR: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: '#3b82f6', // azul
  INUNDACAO: '#1d4ed8',  // azul escuro
};

const LABEL: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: 'Alagamento',
  INUNDACAO: 'Inundação',
};

/** Ícone de ponto (divIcon SVG) — evita o ícone default do Leaflet que quebra no Vite. */
export function iconeOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): L.DivIcon {
  const cor = COR[tipo];
  return L.divIcon({
    className: '',
    html:
      `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" ` +
      `style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4))">` +
      `<circle cx="7" cy="7" r="5" fill="${cor}" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export interface OcorrenciaFormatada {
  titulo: string;
  data: string;
  subprefeitura: string | null;
}

/**
 * Formata os campos de uma ocorrência para exibição (tipo legível + data pt-BR +
 * subprefeitura). A data é uma data-calendário (00:00Z), então formatamos em UTC
 * para não deslocar o dia em fusos negativos (ex.: America/Sao_Paulo). Retorna
 * partes para renderizar como JSX (sem innerHTML — evita XSS com dado externo).
 */
export function formatarOcorrencia(o: OcorrenciaAlagamentoDto): OcorrenciaFormatada {
  return {
    titulo: LABEL[o.tipo],
    data: new Date(o.dataOcorrencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    subprefeitura: o.nmSubprefeitura,
  };
}
