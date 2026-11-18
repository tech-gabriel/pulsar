import { SUBPREFEITURAS, VIEWBOX } from '../../components/landing/mapaPaths';
import { slugify } from '../../data/regioes-seo';
import { normalizarNome } from '../../utils/texto';

/**
 * Chave de uma área no mapa a partir do nome, seja do banco ("M'Boi Mirim") ou do desenho
 * ("M BOI MIRIM"): normalizarNome casa os dois (apóstrofo vira espaço) e o slug dá o id.
 */
export const idDaArea = (nome: string): string => slugify(normalizarNome(nome));

/** Desenho de uma área no mapa da cidade (id = slug do nome). */
export interface GeometriaArea {
  id: string;
  nome: string;
  d: string;
}

/**
 * A cidade como dado: os componentes recebem daqui o nome e o desenho do mapa, em vez
 * de escreverem "São Paulo". No E1, esta definição passa a vir da API (cidade → área).
 */
export interface Cidade {
  id: string;
  nome: string;
  viewBox: string;
  areas: GeometriaArea[];
}

export const CIDADE_ATUAL: Cidade = {
  id: 'sao-paulo',
  nome: 'São Paulo',
  viewBox: VIEWBOX,
  areas: SUBPREFEITURAS,
};

/** Nome da cidade da Baixada como vem da API (Regiao.Cidade.Nome). */
export const BAIXADA = 'Baixada Santista';

type ComCidade = { cidade?: string };

/**
 * O nome da área que a pessoa enxerga, para os avisos de "fora": só a capital até a Baixada
 * abrir ao público (a conta comum nunca lê "Baixada"). Sem cidade (snapshot do SSG) é São Paulo.
 */
export function nomeDaCobertura(areas: ComCidade[]): string {
  return areas.some((a) => a.cidade === BAIXADA) ? 'São Paulo e Baixada Santista' : 'São Paulo capital';
}

/** A zona escrita para quem lê: "Zona Leste", "Centro" ou, na Baixada, "Baixada Santista". */
export function zonaDaArea(area: { zona: string } & ComCidade): string {
  if (area.cidade === BAIXADA) return BAIXADA;
  return area.zona === 'Centro' ? 'Centro' : `Zona ${area.zona}`;
}

/** Onde fica a área: "Zona Leste · São Paulo", "Centro · São Paulo" ou "Baixada Santista". */
export function lugarDaArea(area: { zona: string } & ComCidade): string {
  return area.cidade === BAIXADA ? BAIXADA : `${zonaDaArea(area)} · São Paulo`;
}
