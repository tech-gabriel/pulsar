import type { ChuvaMedida } from '../types';

export const mmMedido = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`;

/**
 * A frase da chuva medida, para quem só bate o olho. Fala da menor janela que dá para afirmar:
 * 15 minutos (CGE-SP) ou, sem ela, a última hora (CEMADEN). Null quando nenhuma dá: aí não se
 * mostra nada medido (janela null não é zero).
 */
export function fraseChuvaMedida(m: ChuvaMedida): string | null {
  if (m.mm15 !== null) return m.mm15 > 0 ? `Chove agora: ${mmMedido(m.mm15)} em 15 min` : 'Sem chuva agora';
  if (m.mm60 !== null) return m.mm60 > 0 ? `Choveu ${mmMedido(m.mm60)} na última hora` : 'Sem chuva na última hora';
  return null;
}
