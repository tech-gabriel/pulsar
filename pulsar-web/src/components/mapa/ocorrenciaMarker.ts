import type { FeatureCollection, Point } from 'geojson';
import type { OcorrenciaAlagamentoDto } from '../../types';
import { PALETA } from '../../utils/paleta';

// Cores por tipo, vindas da paleta das leituras do mapa (utils/paleta.ts): são
// os mesmos dois azuis da camada de chuva, então o overlay lê como parte do
// mapa e não como um elemento de outro sistema. O tom profundo separa a
// inundação do alagamento mesmo de longe, quando o pictograma ainda não é
// legível.
const COR: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: PALETA.azul,
  INUNDACAO: PALETA.azulProfundo,
};

const LABEL: Record<OcorrenciaAlagamentoDto['tipo'], string> = {
  ALAGAMENTO: 'Alagamento',
  INUNDACAO: 'Inundação',
};

/** Geometria do disco, compartilhada entre o marcador e a legenda. */
export const DISCO = { cx: 14, cy: 14, r: 12.1, traco: 1.9 } as const;

// O disco desenhado tem 28px (o mínimo em que o pictograma ainda se lê) e o
// ícone ocupa 36px, para sobrar folga de toque: o SVG fica centralizado dentro
// dessa caixa transparente.
export const LADO_DESENHO = 28;
const ALVO = 36;
const RECUO = (ALVO - LADO_DESENHO) / 2;

/**
 * Pictograma branco dentro do disco, distinto por tipo:
 *  - ALAGAMENTO: gota (alagamento pontual de rua)
 *  - INUNDACAO: ondas (transbordamento / corpo d'água)
 *
 * Os caminhos são os oficiais do lucide-react (`droplet` e `waves-horizontal`),
 * na grade 24x24 de origem — a mesma família de ícones que o resto do app usa.
 * Isso resolve dois problemas de uma vez: o desenho passa a ter o traço e a
 * construção dos outros ícones da interface, e fica de fato centrado. Os
 * caminhos escritos à mão que estavam aqui saíam tortos: as ondas 2,1px à
 * esquerda e a gota 1,25px acima do centro do disco.
 *
 * Os caminhos ficam como dado, não como HTML: o Leaflet precisa de string (o
 * divIcon só aceita markup) e a legenda renderiza JSX. Mantendo o desenho aqui,
 * os dois nunca divergem e a legenda não precisa de innerHTML.
 */
export const GLIFO: Record<OcorrenciaAlagamentoDto['tipo'], string[]> = {
  ALAGAMENTO: [
    'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  ],
  INUNDACAO: [
    'M2 5q2.5 2 5 0t5 0 5 0 5 0',
    'M2 12q2.5 2 5 0t5 0 5 0 5 0',
    'M2 19q2.5 2 5 0t5 0 5 0 5 0',
  ],
};

const GRADE_LUCIDE = 24;
/** Lado do glifo dentro do disco de 28px: sobra ~5,5px de respiro de cada lado. */
const LADO_GLIFO = 17;
const ESCALA = LADO_GLIFO / GRADE_LUCIDE;
const DESLOCAMENTO = (LADO_DESENHO - LADO_GLIFO) / 2;

/** Encaixa a grade 24x24 do lucide centralizada no disco de 28px. */
export const TRANSFORM_GLIFO = `translate(${DESLOCAMENTO} ${DESLOCAMENTO}) scale(${ESCALA})`;

// O lucide desenha com traço 2 na grade de 24, o que com a escala acima daria
// 1,4px — fino demais sobre um disco de 28px visto no mapa. 2.8 na grade rende
// ~2px na tela, que é o peso em que o pictograma ainda se lê de longe.
export const TRACO_GLIFO = 2.8;

export function corOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): string {
  return COR[tipo];
}

function glifoParaSvg(tipo: OcorrenciaAlagamentoDto['tipo']): string {
  const caminhos = GLIFO[tipo].map((d) => `<path d="${d}"/>`).join('');
  return (
    `<g transform="${TRANSFORM_GLIFO}" fill="none" stroke="#ffffff" ` +
    `stroke-width="${TRACO_GLIFO}" stroke-linecap="round" stroke-linejoin="round">${caminhos}</g>`
  );
}

/** Lado do ícone (px CSS): o disco de 28px com folga de toque em volta. */
export const LADO_ICONE = ALVO;

/**
 * SVG do ponto (disco + pictograma por tipo), rasterizado e registrado como imagem no mapa.
 * A sombra que o Leaflet aplicava por CSS vai como filtro dentro do próprio SVG.
 */
export function svgOcorrencia(tipo: OcorrenciaAlagamentoDto['tipo']): string {
  const disco =
    `<circle cx="${DISCO.cx}" cy="${DISCO.cy}" r="${DISCO.r}" fill="${COR[tipo]}" ` +
    `stroke="#ffffff" stroke-width="${DISCO.traco}" filter="url(#sombra)"/>`;
  const sombra =
    '<defs><filter id="sombra" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.45"/></filter></defs>';
  return (
    `<svg width="${ALVO}" height="${ALVO}" viewBox="0 0 ${ALVO} ${ALVO}" xmlns="http://www.w3.org/2000/svg">` +
    `${sombra}<g transform="translate(${RECUO}, ${RECUO})">${disco}${glifoParaSvg(tipo)}</g></svg>`
  );
}

export interface PropsOcorrencia {
  id: string;
  tipo: OcorrenciaAlagamentoDto['tipo'];
}

/** Pontos das ocorrências para a fonte agrupada do mapa (GeoJSON é lon, lat). */
export function ocorrenciasGeojson(lista: OcorrenciaAlagamentoDto[]): FeatureCollection<Point, PropsOcorrencia> {
  return {
    type: 'FeatureCollection',
    features: lista.map((o) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [o.longitude, o.latitude] },
      properties: { id: o.id, tipo: o.tipo },
    })),
  };
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
