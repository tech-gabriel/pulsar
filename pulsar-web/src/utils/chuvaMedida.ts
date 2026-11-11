import type { ChuvaMedida } from '../types';

const mm = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * A frase da chuva medida pelo posto do CGE-SP. Null quando nenhuma janela dá para afirmar:
 * aí não se mostra nada medido (janela null não é zero).
 */
export function textoChuvaMedida(m: ChuvaMedida): string | null {
  if (m.mm15 === null && m.mm60 === null) return null;
  if (!m.mm15 && !m.mm60) return m.mm60 === null ? 'Sem chuva nos últimos 15 min' : 'Sem chuva na última hora';
  return [
    m.mm15 === null ? null : `${mm(m.mm15)} mm em 15 min`,
    m.mm60 === null ? null : `${mm(m.mm60)} mm em 1 h`,
  ].filter(Boolean).join(' · ');
}
