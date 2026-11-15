import api from './client';
import type { CelulasAgoraDto } from '../types';

/** Risco de alagamento de agora em cada trecho da cidade, com a estação que mandou na conta. */
export async function buscarCelulasAgora(): Promise<CelulasAgoraDto> {
  const { data } = await api.get<CelulasAgoraDto>('/celulas');
  return data;
}
