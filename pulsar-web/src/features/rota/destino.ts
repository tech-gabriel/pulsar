import type { FeatureCollection } from 'geojson';
import type { PontoBusca } from '../../components/mapa/MapaBase';
import { resolverRegiaoPorPonto } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import type { SubprefeituraMapaDto } from '../../types';
import type { PontoRota } from './tipos';

/**
 * Destino do "Como chegar" no detalhe de uma subprefeitura. O ponto buscado só vale se foi escolhido
 * por endereço (ou pin arrastado, não localização) e cai dentro desta subprefeitura; ponto velho de
 * outra busca ou a localização da pessoa levaria a rota para o lugar errado. Senão, o centro dela.
 */
export function escolherDestinoComoChegar(
  sub: SubprefeituraMapaDto,
  ponto: PontoBusca | null,
  rotulo: string | null,
  geojson: FeatureCollection | null,
): PontoRota {
  if (ponto && ponto.precisao === undefined) {
    const nome = resolverRegiaoPorPonto(ponto.lat, ponto.lon, geojson)?.subprefeituraNome ?? '';
    if (normalizarNome(nome) === normalizarNome(sub.nome)) return { lat: ponto.lat, lon: ponto.lon, rotulo: rotulo ?? 'Ponto escolhido' };
  }
  return { lat: sub.latitude, lon: sub.longitude, rotulo: sub.nome };
}
