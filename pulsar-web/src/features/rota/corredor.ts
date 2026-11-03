import type { FeatureCollection } from 'geojson';
import { resolverRegiaoPorPonto } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { distanciaKm } from '../alagamentosHoje/regras';
import type { PontoRota } from './tipos';

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
  return nomes.map((n) => porNome.get(normalizarNome(n))).filter((id): id is string => !!id);
}
