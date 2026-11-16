import type { FeatureCollection } from 'geojson';
import type { PontoBusca } from '../../components/mapa/MapaBase';
import { resolverRegiaoPorPonto } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { emNomeDe } from '../../data/regioes-seo';
import type { SubprefeituraMapaDto } from '../../types';
import type { PontoRota } from './tipos';

// Logradouros femininos: "perto da Rua", "perto da Av."; o resto, "perto do" (Viaduto, Largo...).
// Fim por espaço ou fim do texto, não por \b: \b falha depois de "." e de "ç" ("Av. Paulista").
const FEMININOS = /^(rua|r\.|avenida|av\.|alameda|al\.|travessa|tv\.|praça|pça\.|estrada|est\.|rodovia|rod\.|ladeira|via|marginal|passarela|ponte)(?=\s|$)/i;

/**
 * Nome do destino quando a rota vai a um trecho tocado: a rua mais perto do centro dele, que diz
 * para onde a rota vai ("Perto da Rua Taquari": curto para caber no campo Para; a região está no mapa).
 */
export function rotuloDoTrecho(nomeArea: string, rua: string | null): string {
  if (!rua) return `Trecho ${emNomeDe(nomeArea)}`;
  return pertoDe(rua);
}

function pertoDe(rua: string): string {
  return `Perto ${FEMININOS.test(rua) ? 'da' : 'do'} ${rua}`;
}

/** Até aqui o pino está na rua; mais longe, só perto dela (o endereço que a nomeou fica a essa distância). */
export const PINO_NA_RUA_METROS = 60;

/** Nome de onde o pino arrastado caiu: "Rua X, Mooca" em cima da rua, "Perto da Rua X, Mooca" longe dela. */
export function rotuloDoPino(nomeArea: string, rua: string, metros: number): string {
  return `${metros <= PINO_NA_RUA_METROS ? rua : pertoDe(rua)}, ${nomeArea}`;
}

/**
 * Destino do "Rota até aqui" no detalhe de uma subprefeitura. Primeiro o endereço que a pessoa
 * buscou, exatamente ele (decisão de produto de 15/11): vale se foi escolhido por endereço (ou pin
 * arrastado, não localização) e cai dentro desta subprefeitura; ponto velho de outra busca ou a
 * localização da pessoa levaria a rota para o lugar errado. Depois o centro do trecho tocado.
 * Senão, o centro da subprefeitura.
 */
export function escolherDestinoComoChegar(
  sub: SubprefeituraMapaDto,
  ponto: PontoBusca | null,
  rotulo: string | null,
  geojson: FeatureCollection | null,
  trechoTocado: { lat: number; lon: number } | null = null,
): PontoRota {
  if (ponto && ponto.precisao === undefined) {
    const nome = resolverRegiaoPorPonto(ponto.lat, ponto.lon, geojson)?.subprefeituraNome ?? '';
    if (normalizarNome(nome) === normalizarNome(sub.nome)) return { lat: ponto.lat, lon: ponto.lon, rotulo: rotulo ?? 'Ponto escolhido' };
  }
  if (trechoTocado) return { ...trechoTocado, rotulo: rotuloDoTrecho(sub.nome, null) };
  return { lat: sub.latitude, lon: sub.longitude, rotulo: sub.nome };
}
