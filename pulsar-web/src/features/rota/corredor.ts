import type { FeatureCollection } from 'geojson';
import { resolverRegiaoPorPonto } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { distanciaKm } from '../alagamentosHoje/regras';
import type { PontoRota } from './tipos';
import { textoSerra } from './textos';

export const PASSO_CORREDOR_M = 200;

export type Corredor =
  | { ok: true; nomes: string[]; segmentos: { nome: string; coords: [number, number][] }[] }
  | { ok: false; motivo: 'origemFora' | 'destinoFora' };

/**
 * Subprefeituras que a reta origem-destino atravessa, na ordem, sem repetição
 * consecutiva. É uma aproximação em linha reta (não o traçado real da rua);
 * pontos intermediários fora dos polígonos são ignorados. Os nomes vêm como
 * estão no GeoJSON; quem casa com a API usa idsDosTrechos (normaliza).
 */
export function tracarCorredor(
  origem: PontoRota,
  destino: PontoRota,
  geojson: FeatureCollection,
  passoM = PASSO_CORREDOR_M,
): Corredor {
  if (!resolverRegiaoPorPonto(origem.lat, origem.lon, geojson)) return { ok: false, motivo: 'origemFora' };
  if (!resolverRegiaoPorPonto(destino.lat, destino.lon, geojson)) return { ok: false, motivo: 'destinoFora' };

  const passos = Math.max(1, Math.ceil((distanciaKm(origem, destino) * 1000) / passoM));
  const nomes: string[] = [];
  const segmentos: { nome: string; coords: [number, number][] }[] = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const lat = origem.lat + (destino.lat - origem.lat) * t;
    const lon = origem.lon + (destino.lon - origem.lon) * t;
    const nome = resolverRegiaoPorPonto(lat, lon, geojson)?.subprefeituraNome;
    if (!nome) continue;
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.nome === nome) {
      ultimo.coords.push([lon, lat]);
    } else {
      nomes.push(nome);
      segmentos.push({ nome, coords: [[lon, lat]] });
    }
  }
  return { ok: true, nomes, segmentos };
}

export function idsDosTrechos(nomes: string[], subs: { id: string; nome: string }[]): string[] {
  const porNome = new Map(subs.map((s) => [normalizarNome(s.nome), s.id]));
  // Únicos, na ordem do caminho: a API recusa (400) id repetido.
  const ids = nomes.map((n) => porNome.get(normalizarNome(n))).filter((id): id is string => !!id);
  return [...new Set(ids)];
}

/**
 * As áreas que a rota avalia. Na mesma cidade, as do caminho (idsDosTrechos). Entre cidades
 * (capital ↔ Baixada), só as pontas: a serra no meio não tem trecho nem medida, e o painel diz
 * isso (TEXTO_SERRA). Área sem cidade (snapshot do SSG) conta como São Paulo.
 */
export function idsDaRota(
  corredor: Corredor,
  subs: { id: string; nome: string; cidade?: string }[],
): { ids: string[]; atravessaSerra: boolean; textoSerra: string | null } {
  if (!corredor.ok || corredor.nomes.length === 0) return { ids: [], atravessaSerra: false, textoSerra: null };
  const porNome = new Map(subs.map((s) => [normalizarNome(s.nome), s]));
  const area = (nome: string) => porNome.get(normalizarNome(nome));
  const saida = area(corredor.nomes[0]);
  const chegada = area(corredor.nomes[corredor.nomes.length - 1]);
  const cidade = (s: { cidade?: string } | undefined) => s?.cidade ?? 'São Paulo';
  if (saida && chegada && cidade(saida) !== cidade(chegada)) {
    const desce = cidade(saida) === 'São Paulo';
    const bertioga = [saida, chegada].some((a) => normalizarNome(a.nome) === normalizarNome('Bertioga'));
    return { ids: [saida.id, chegada.id], atravessaSerra: true, textoSerra: textoSerra(desce, bertioga) };
  }
  return { ids: idsDosTrechos(corredor.nomes, subs), atravessaSerra: false, textoSerra: null };
}
