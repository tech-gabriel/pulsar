import type { FeatureCollection } from 'geojson';
import { resolverRegiaoPorPonto } from './geo';
import { normalizarNome } from './texto';
import { nomeDaCobertura } from '../features/cidade/cidade';

export type OrigemPonto = 'busca' | 'localizacao';

export interface Selecao<S> {
  sub: S | null;
  zona: string | null;
  aviso: string | null;
}

const AVISO_FORA: Record<OrigemPonto, (cobertura: string) => string> = {
  busca: (c) => `Esse endereço está fora da área coberta (${c}).`,
  localizacao: (c) => `Você parece estar fora de ${c}, a área que cobrimos hoje.`,
};

/**
 * Resolve um ponto (lat/lon) para uma seleção de subprefeitura/região a partir
 * do GeoJSON e da lista de subprefeituras do backend. Fora dos polígonos, devolve
 * o aviso adequado à origem (busca × localização). Lógica antes embutida em
 * `handleSelecionarEndereco`, agora compartilhada por busca e geolocalização.
 */
export function resolverSelecao<S extends { nome: string; zona: string; cidade?: string }>(
  lat: number,
  lon: number,
  geojson: FeatureCollection | null,
  subprefeituras: S[],
  origem: OrigemPonto,
): Selecao<S> {
  const resolvido = resolverRegiaoPorPonto(lat, lon, geojson);
  if (!resolvido) {
    return { sub: null, zona: null, aviso: AVISO_FORA[origem](nomeDaCobertura(subprefeituras)) };
  }
  const sub =
    subprefeituras.find(
      (s) => normalizarNome(s.nome) === normalizarNome(resolvido.subprefeituraNome),
    ) ?? null;
  return {
    sub,
    zona: sub ? sub.zona : resolvido.regiaoNome,
    aviso: null,
  };
}
