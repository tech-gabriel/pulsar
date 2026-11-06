import type { FeatureCollection } from 'geojson';
import type { LocalSalvoDto, TipoLocal } from '../../types';
import type { PontoRota } from '../rota/tipos';
import { idsDosTrechos } from '../rota/corredor';
import { resolverRegiaoPorPonto } from '../../utils/geo';

export const ROTULO_TIPO: Record<TipoLocal, string> = { CASA: 'Casa', TRABALHO: 'Trabalho' };

/** Id (da API) da subprefeitura que contém o ponto; null se fora de SP ou sem dados. */
export function subprefeituraIdDoPonto(
  p: { lat: number; lon: number },
  geojson: FeatureCollection | null,
  subs: { id: string; nome: string }[],
): string | null {
  const regiao = resolverRegiaoPorPonto(p.lat, p.lon, geojson);
  if (!regiao) return null;
  return idsDosTrechos([regiao.subprefeituraNome], subs)[0] ?? null;
}

export function pontoDoLocal(l: LocalSalvoDto): PontoRota {
  return { lat: l.latitude, lon: l.longitude, rotulo: l.rotulo };
}
