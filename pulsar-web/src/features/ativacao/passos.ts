import type { EstadoPush } from '../../hooks/usePushSubscription';

export type Passo = 'promessa' | 'escolher' | 'instalar' | 'alerta' | 'pronto';
export type Instalacao = 'instalado' | 'ios-safari' | 'prompt' | 'indisponivel';

/** Retrato da pessoa que decide o roteiro. Sem DOM: serve também ao app nativo. */
export interface ContextoAtivacao {
  favoritas: number;
  push: EstadoPush;
  instalacao: Instalacao;
}

/**
 * Quais telas mostrar, em ordem. Lista vazia = sem onboarding. O roteiro se calcula pelo
 * estado (state-driven): a retomada no iPhone instalado é este mesmo cálculo com outros fatos.
 */
export function calcularPassos(c: ContextoAtivacao): Passo[] {
  const passos: Passo[] = [];
  if (c.favoritas === 0) passos.push('promessa', 'escolher');
  if (c.instalacao === 'ios-safari' || c.instalacao === 'prompt') passos.push('instalar');
  // No iPhone fora do app instalado o push não existe: pedir seria um pedido impossível.
  if (c.push === 'inativo' && c.instalacao !== 'ios-safari') passos.push('alerta');
  if (passos.length > 0) passos.push('pronto');
  return passos;
}

/** Quem é levado ao onboarding ao entrar no mapa (além da marca local "já viu"). */
export function precisaDeAtivacao(c: ContextoAtivacao): boolean {
  return c.favoritas === 0 || (c.instalacao === 'instalado' && c.push === 'inativo');
}

export const MARCA_ATIVACAO = 'pulsar-ativacao-vista-v1';

export function jaViuAtivacao(): boolean {
  try {
    return localStorage.getItem(MARCA_ATIVACAO) === '1';
  } catch {
    return true; // sem armazenamento, não insistir a cada entrada
  }
}

export function marcarAtivacaoVista(): void {
  try {
    localStorage.setItem(MARCA_ATIVACAO, '1');
  } catch {
    /* ignora */
  }
}

export function limparAtivacaoVista(): void {
  try {
    localStorage.removeItem(MARCA_ATIVACAO);
  } catch {
    /* ignora */
  }
}
