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

/** Há leitura que dê para afirmar? Sem isso a faixa "Medida agora" não existe e a estimada fala sozinha. */
export const temChuvaMedida = (medida: ChuvaMedida | null | undefined): medida is ChuvaMedida =>
  !!medida && fraseChuvaMedida(medida) !== null;

/** Distância sempre com uma casa ("2,0 km", "0,4 km"), igual em todo o app. */
export const km = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

/** O CEMADEN cola o número no nome ("Penha3"): para ler, "Penha 3". Comparações usam o nome cru. */
export const nomeEstacao = (nome: string) => nome.replace(/(\p{L})(\d+)$/u, '$1 $2');

/**
 * De onde é a leitura, curto, ao lado de "Medida agora" (opção A, escolhida em 15/11): o lugar e,
 * quando se sabe, a distância. CGE ou CEMADEN fica para a folha do toque.
 */
export function ondeMediu(m: ChuvaMedida): string {
  if (m.fonte === 'cemaden') return `Estação ${nomeEstacao(m.posto)}${m.distanciaKm != null ? ` · ${km(m.distanciaKm)}` : ''}`;
  return `Posto ${m.posto}${m.vizinho ? ' · vizinho' : ''}`;
}
