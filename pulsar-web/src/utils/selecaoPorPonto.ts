import type { FeatureCollection } from 'geojson';
import { resolverRegiaoPorPonto } from './geo';
import { normalizarNome } from './texto';

export type OrigemPonto = 'busca' | 'localizacao';

export interface Selecao<S> {
  sub: S | null;
  regiaoNome: string | null;
  aviso: string | null;
}

const AVISO_FORA: Record<OrigemPonto, string> = {
  busca: 'Esse endereço está fora da área coberta (São Paulo capital).',
  localizacao: 'Você parece estar fora de São Paulo capital, a área que cobrimos hoje.',
};

/**
 * Resolve um ponto (lat/lon) para uma seleção de subprefeitura/região a partir
 * do GeoJSON e da lista de subprefeituras do backend. Fora dos polígonos, devolve
 * o aviso adequado à origem (busca × localização). Lógica antes embutida em
 * `handleSelecionarEndereco`, agora compartilhada por busca e geolocalização.
 */
export function resolverSelecao<S extends { nome: string; regiaoNome: string }>(
  lat: number,
  lon: number,
  geojson: FeatureCollection | null,
  subprefeituras: S[],
  origem: OrigemPonto,
): Selecao<S> {
  const resolvido = resolverRegiaoPorPonto(lat, lon, geojson);
  if (!resolvido) {
    return { sub: null, regiaoNome: null, aviso: AVISO_FORA[origem] };
  }
  const sub =
    subprefeituras.find(
      (s) => normalizarNome(s.nome) === normalizarNome(resolvido.subprefeituraNome),
    ) ?? null;
  return {
    sub,
    regiaoNome: sub ? sub.regiaoNome : resolvido.regiaoNome,
    aviso: null,
  };
}
