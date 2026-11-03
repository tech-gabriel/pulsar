import type { FeatureCollection } from 'geojson';
import { subprefeituras, type SubprefeituraSeo } from '../../data/regioes-seo';
import { resolverRegiaoPorPonto } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';

/** Ponto do public/pontos-alagamento.json (gerado no build a partir do GeoSampa). */
export interface Ponto {
  id: string;
  lat: number;
  lon: number;
  tipo: 'ALAGAMENTO' | 'INUNDACAO';
  data: string; // AAAA-MM-DD
  sub: string; // slug da subprefeitura
}

export interface Periodo {
  de: string | null;
  ate: string | null;
}

const RAIO_TERRA_KM = 6371;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em linha reta (haversine). */
export function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export function pontosPerto(pontos: Ponto[], centro: { lat: number; lon: number }, raioKm = 2): Ponto[] {
  return pontos.filter((p) => distanciaKm(centro, p) <= raioKm);
}

export function pontosDaSubprefeitura(pontos: Ponto[], slug: string): Ponto[] {
  return pontos.filter((p) => p.sub === slug);
}

const porNome = new Map(subprefeituras.map((s) => [normalizarNome(s.nome), s]));
const porDistrito = new Map(subprefeituras.flatMap((s) => s.distritos.map((d) => [normalizarNome(d), s] as const)));

export function subprefeituraDoDistrito(distrito: string): SubprefeituraSeo | undefined {
  return porDistrito.get(normalizarNome(distrito));
}

/** Em qual subprefeitura o ponto está, pelo contorno leve. Fora do município: null. */
export function subprefeituraDoPonto(lat: number, lon: number, geojsonLeve: FeatureCollection | null): SubprefeituraSeo | null {
  const achada = resolverRegiaoPorPonto(lat, lon, geojsonLeve);
  return achada ? (porNome.get(normalizarNome(achada.subprefeituraNome)) ?? null) : null;
}

/** Nome que a API devolve (o mesmo do seed) para o slug das páginas. */
export function slugPorNomeApi(nome: string): string | undefined {
  return porNome.get(normalizarNome(nome))?.slug;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesAno = (iso: string) => ({ mes: MESES[Number(iso.slice(5, 7)) - 1], ano: iso.slice(0, 4) });

/** "de janeiro a agosto de 2026", "em março de 2026" ou "de dezembro de 2025 a fevereiro de 2026". */
export function periodoLegivel({ de, ate }: Periodo): string {
  if (!de || !ate) return '';
  const a = mesAno(de);
  const b = mesAno(ate);
  if (a.ano === b.ano && a.mes === b.mes) return `em ${a.mes} de ${a.ano}`;
  if (a.ano === b.ano) return `de ${a.mes} a ${b.mes} de ${b.ano}`;
  return `de ${a.mes} de ${a.ano} a ${b.mes} de ${b.ano}`;
}
