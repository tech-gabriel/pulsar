import api from './client';
import type { OcorrenciasProximasDto } from '../types';

/** Raio do "perto de mim". Localização com erro maior que isso pede ajuste do pin. */
export const RAIO_PROXIMAS_M = 500;

/** Resumo das ocorrências de alagamento perto de um ponto + sinal de risco atual. */
export async function buscarOcorrenciasProximas(
  lat: number,
  lon: number,
  raioMetros = RAIO_PROXIMAS_M,
): Promise<OcorrenciasProximasDto> {
  const { data } = await api.get<OcorrenciasProximasDto>('/ocorrencias/alagamento/proximas', {
    params: { lat, lon, raioMetros },
  });
  return data;
}
