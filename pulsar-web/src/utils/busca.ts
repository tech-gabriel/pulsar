import type { EnderecoBusca } from '../types';

const CEP = /\b\d{5}-?\d{3}\b/g;

/**
 * O número da casa que a pessoa digitou e o resultado não tem: o MapTiler não conhece todo
 * número e devolve a rua inteira (ou outro número). O número da casa é o ÚLTIMO número digitado
 * ("Rua 25 de Março 100" é o 100), e o CEP do resultado não conta como número. Sem número
 * digitado, ou com ele no resultado, undefined.
 */
export function numeroFaltando(termo: string, r: EnderecoBusca): string | undefined {
  const numero = [...termo.replace(CEP, ' ').matchAll(/\b(\d{1,5})\b/g)].at(-1)?.[1];
  if (!numero) return undefined;
  const texto = `${r.nome ?? ''} ${r.descricao ?? ''}`.replace(CEP, ' ');
  return new RegExp(`\\b${numero}\\b`).test(texto) ? undefined : numero;
}
