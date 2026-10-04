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
