import type { FaixaPrevisaoDto } from '../types';

// Espelham LimiaresNotificacao no backend (ChuvaFortePrevistaMm e ProbabilidadeMinima):
// o destaque visual tem que marcar a mesma faixa que dispara o push, senão o app e a
// notificação contam histórias diferentes sobre o mesmo dia. É duplicação entre dois
// runtimes de propósito, porque a alternativa seria servir limiar por endpoint só para
// pintar uma barra. Quem recalibrar os limiares do push (frentes N1/N2) muda os dois.
export const CHUVA_FORTE_MM = 10;
export const PROBABILIDADE_MINIMA = 0.6;

export function chuvaForte(f: FaixaPrevisaoDto): boolean {
  // probabilidadeChuva é fração de 0 a 1, e não porcentagem: comparar com 60 aqui
  // faria o destaque nunca acontecer.
  return f.chuvaMm >= CHUVA_FORTE_MM && f.probabilidadeChuva >= PROBABILIDADE_MINIMA;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const inicioDoDia = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * "hoje às 15h", "amanhã às 12h" ou "sábado às 9h", no fuso do navegador (o backend grava
 * UTC com Z). `agora` é parâmetro para o componente não ler o relógio durante o render.
 */
export function quando(iso: string, agora: number): string {
  const ms = new Date(iso).getTime();
  const dias = Math.round((inicioDoDia(ms) - inicioDoDia(agora)) / DIA_MS);
  const dia = dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : new Date(ms).toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
  return `${dia} às ${new Date(ms).getHours()}h`;
}

/** Frase curta da primeira chuva forte prevista, ou null se não há nenhuma. */
export function fraseChuvaForte(faixas: FaixaPrevisaoDto[], agora: number): string | null {
  const f = faixas.find(chuvaForte);
  return f ? `Chuva forte ${quando(f.instantePrevisto, agora)}` : null;
}
