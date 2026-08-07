import api from './client';
import type { OcorrenciasProximasDto } from '../types';

/** Resumo das ocorrências de alagamento perto de um ponto + sinal de risco atual. */
export async function buscarOcorrenciasProximas(
  lat: number,
  lon: number,
  raioMetros = 500,
): Promise<OcorrenciasProximasDto> {
  const { data } = await api.get<OcorrenciasProximasDto>('/ocorrencias/alagamento/proximas', {
    params: { lat, lon, raioMetros },
  });
  return data;
}
