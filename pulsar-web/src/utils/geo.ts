import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
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

/**
 * Ray casting (even-odd): testa se o ponto (lat, lon) está dentro de um anel de
 * coordenadas no formato GeoJSON [lon, lat].
 */
function pontoEmAnel(lat: number, lon: number, anel: Position[]): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [loni, lati] = anel[i];
    const [lonj, latj] = anel[j];
    const intersecta =
      lati > lat !== latj > lat &&
      lon < ((lonj - loni) * (lat - lati)) / (latj - lati) + loni;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

/**
 * Encontra a feature (subprefeitura) cujo polígono contém o ponto, considerando
 * o anel externo de cada Polygon. Retorna null se o ponto está fora de todos
 * (ex.: endereço fora do município de São Paulo).
 */
export function pontoEmPoligono(
  lat: number,
  lon: number,
  geojson: FeatureCollection | null,
): Feature | null {
  if (!geojson?.features) return null;
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom?.type !== 'Polygon') continue;
    const anelExterno = (geom as Polygon).coordinates[0];
    if (pontoEmAnel(lat, lon, anelExterno)) return feature;
  }
  return null;
}

/**
 * Resolve um ponto geográfico para a subprefeitura/região correspondente, usando
 * os polígonos do GeoJSON oficial e os nomes (nm_subprefeitura / nm_regiao_05)
 * nele embutidos. O casamento com os dados do backend é feito por quem chama,
 * via normalizarNome sobre o subprefeituraNome retornado.
 */
export function resolverRegiaoPorPonto(
  lat: number,
  lon: number,
  geojson: FeatureCollection | null,
): { subprefeituraNome: string; regiaoNome: string } | null {
  const feature = pontoEmPoligono(lat, lon, geojson);
  if (!feature) return null;
  const props = feature.properties ?? {};
  const sub = String(props.nm_subprefeitura ?? '').trim();
  const reg = String(props.nm_regiao_05 ?? '').trim();
  if (!sub) return null;
  return { subprefeituraNome: sub, regiaoNome: reg };
}
