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

// Glifo branco dentro do marcador, distinto por tipo:
//  - ALAGAMENTO: gota (alagamento pontual de rua)
//  - INUNDACAO: ondas (transbordamento / corpo d'água)
const GLIFO: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO:
    '<path d="M10 5.2c-2.3 2.6-3.4 4.3-3.4 5.6a3.4 3.4 0 0 0 6.8 0c0-1.3-1.1-3-3.4-5.6z" fill="#ffffff"/>',
  INUNDACAO:
    '<g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M5.5 9 q1.5 -1.7 3 0 t3 0 t2 0"/>' +
    '<path d="M5.5 12.2 q1.5 -1.7 3 0 t3 0 t2 0"/></g>',
};

/** Ícone de ponto (divIcon SVG) — glifo distinto por tipo; evita o ícone default do Leaflet (quebra no Vite). */
export function iconeOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): L.DivIcon {
  const cor = COR[tipo];
  return L.divIcon({
    className: '',
    html:
      `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" ` +
      `style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4))">` +
      `<circle cx="10" cy="10" r="8" fill="${cor}" stroke="#ffffff" stroke-width="1.5"/>` +
      `${GLIFO[tipo]}</svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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
