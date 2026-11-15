import type { EnderecoBusca } from '../types';

/**
 * O número da casa que a pessoa digitou e o resultado não tem: o MapTiler não conhece todo
 * número e devolve a rua inteira (ou outro número). Sem número digitado, ou com ele no resultado,
 * undefined.
 */
export function numeroFaltando(termo: string, r: EnderecoBusca): string | undefined {
  const numero = termo.match(/\b(\d{1,5})\b/)?.[1];
  if (!numero) return undefined;
  return new RegExp(`\\b${numero}\\b`).test(`${r.nome ?? ''} ${r.descricao ?? ''}`) ? undefined : numero;
}
