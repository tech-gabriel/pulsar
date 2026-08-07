import L from 'leaflet';
import type { OcorrenciaAlagamentoDto } from '../../types';

// Cores por tipo (distintas das camadas de score). O azul da inundação é bem
// mais fechado que o do alagamento para os dois se separarem mesmo de longe,
// quando o pictograma ainda não é legível.
const COR: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: '#3B82F6', // azul
  INUNDACAO: '#1E40AF',  // azul escuro
};

const LABEL: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: 'Alagamento',
  INUNDACAO: 'Inundação',
};

/**
 * Pictograma branco dentro do disco, distinto por tipo:
 *  - ALAGAMENTO: gota (alagamento pontual de rua)
 *  - INUNDACAO: ondas (transbordamento / corpo d'água)
 *
 * A versão anterior desses glifos ficava ilegível porque o disco tinha 20px e o
 * traço das ondas, 1.5. O que resolve não é trocar por forma geométrica: é dar
 * tamanho e peso. O disco passou a 28px, a gota é sólida (preenchimento lê
 * melhor que contorno em tamanho pequeno) e as ondas ganharam traço 2.6, com
 * menos ondulações e mais espaço entre elas.
 *
 * Os caminhos ficam como dado, não como HTML: o Leaflet precisa de string (o
 * divIcon só aceita markup) e a legenda renderiza JSX. Mantendo o desenho aqui,
 * os dois nunca divergem e a legenda não precisa de innerHTML.
 */
export interface GlifoOcorrencia {
  /** `fill`: caminho sólido. `stroke`: contorno, com a espessura indicada. */
  pintura: 'fill' | 'stroke';
  espessura?: number;
  caminhos: string[];
}

export const GLIFO: Record<OcorrenciaAlagamentoDto['tipo'], GlifoOcorrencia> = {
  ALAGAMENTO: {
    pintura: 'fill',
    caminhos: ['M14 6.6c-3.1 3.6-4.6 5.9-4.6 7.7a4.6 4.6 0 0 0 9.2 0c0-1.8-1.5-4.1-4.6-7.7z'],
  },
  INUNDACAO: {
    pintura: 'stroke',
    espessura: 2.6,
    caminhos: ['M7.8 12.2q2.05-2.4 4.1 0t4.1 0', 'M7.8 17.6q2.05-2.4 4.1 0t4.1 0'],
  },
};

/** Geometria do disco, compartilhada entre o marcador e a legenda. */
export const DISCO = { cx: 14, cy: 14, r: 12.1, traco: 1.9 } as const;

// O disco desenhado tem 28px (o mínimo em que o pictograma ainda se lê) e o
// ícone ocupa 36px, para sobrar folga de toque: o SVG fica centralizado dentro
// dessa caixa transparente.
export const LADO_DESENHO = 28;
const ALVO = 36;
const RECUO = (ALVO - LADO_DESENHO) / 2;

export function corOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): string {
  return COR[tipo];
}

function glifoParaSvg(tipo: OcorrenciaAlagamentoDto['tipo']): string {
  const g = GLIFO[tipo];
  const caminhos = g.caminhos.map((d) => `<path d="${d}"/>`).join('');
  return g.pintura === 'fill'
    ? `<g fill="#ffffff">${caminhos}</g>`
    : `<g fill="none" stroke="#ffffff" stroke-width="${g.espessura}" stroke-linecap="round">${caminhos}</g>`;
}

/** Ícone de ponto (divIcon SVG) — pictograma distinto por tipo; evita o ícone default do Leaflet (quebra no Vite). */
export function iconeOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): L.DivIcon {
  const disco =
    `<circle cx="${DISCO.cx}" cy="${DISCO.cy}" r="${DISCO.r}" fill="${COR[tipo]}" ` +
    `stroke="#ffffff" stroke-width="${DISCO.traco}"/>`;

  return L.divIcon({
    className: '',
    html:
      `<svg width="${ALVO}" height="${ALVO}" viewBox="0 0 ${ALVO} ${ALVO}" xmlns="http://www.w3.org/2000/svg" ` +
      `style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.45))">` +
      `<g transform="translate(${RECUO}, ${RECUO})">${disco}${glifoParaSvg(tipo)}</g></svg>`,
    iconSize: [ALVO, ALVO],
    iconAnchor: [ALVO / 2, ALVO / 2],
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
