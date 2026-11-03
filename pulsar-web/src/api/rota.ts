import api from './client';
import type { RotaAvaliacao } from '../features/rota/tipos';

/** Avalia o risco no caminho: ids das subprefeituras atravessadas, na ordem do trajeto. */
export async function avaliarRota(subprefeituraIds: string[]): Promise<RotaAvaliacao> {
  const { data } = await api.post<RotaAvaliacao>('/rota/avaliar', { subprefeituraIds });
  return data;
}

/** Pede um push quando o caminho melhorar. Um pedido por pessoa: o novo troca o antigo. */
export async function pedirAvisoRota(subprefeituraIds: string[], destino: string): Promise<void> {
  await api.post('/rota/aviso', { subprefeituraIds, destino });
}

export async function cancelarAvisoRota(): Promise<void> {
  await api.delete('/rota/aviso');
}
