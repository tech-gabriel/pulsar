import type { SubprefeituraDto } from '../types';

/**
 * O backend não expõe lat/lon da região, apenas das subprefeituras. Usamos a
 * média das coordenadas das subprefeituras como centróide aproximado da região
 * (ETAPA 4.3 — coordenadas; ETAPA 4.7 — centralização do mapa).
 */
export function centroideRegiao(
  subs: Pick<SubprefeituraDto, 'latitude' | 'longitude'>[],
): { lat: number; lon: number } | null {
  if (subs.length === 0) return null;
  const soma = subs.reduce(
    (acc, s) => ({ lat: acc.lat + s.latitude, lon: acc.lon + s.longitude }),
    { lat: 0, lon: 0 },
  );
  return { lat: soma.lat / subs.length, lon: soma.lon / subs.length };
}
