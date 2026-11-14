import api from './client';
import type { RotaAvaliacao } from '../features/rota/tipos';

export interface Coordenada {
  lat: number;
  lon: number;
}

/**
 * Avalia o risco no caminho: ids das subprefeituras atravessadas, na ordem do trajeto. A origem e
 * o destino deixam a API ler o risco nos trechos por onde a reta passa, e não na área inteira.
 */
export async function avaliarRota(subprefeituraIds: string[], origem: Coordenada, destino: Coordenada): Promise<RotaAvaliacao> {
  const { data } = await api.post<RotaAvaliacao>('/rota/avaliar', { subprefeituraIds, pontoOrigem: origem, pontoDestino: destino });
  return data;
}

/** Pede um push quando o caminho melhorar. Um pedido por pessoa: o novo troca o antigo. */
export async function pedirAvisoRota(subprefeituraIds: string[], destino: string, origem: Coordenada, chegada: Coordenada): Promise<void> {
  await api.post('/rota/aviso', { subprefeituraIds, destino, pontoOrigem: origem, pontoDestino: chegada });
}

export async function cancelarAvisoRota(): Promise<void> {
  await api.delete('/rota/aviso');
}
