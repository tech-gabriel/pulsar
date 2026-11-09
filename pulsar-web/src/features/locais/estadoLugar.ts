import type { FaixaPrevisaoDto, PontoAlagamentoCge } from '../../types';
import type { Area } from '../cidade/areas';
import { motivoDoRisco } from '../../utils/risco';
import { fraseChuvaForte } from '../../utils/previsao';
import { ZOOM } from '../../components/mapa/zoom';
import { emNomeDe } from '../../data/regioes-seo';

/** Na vista ampla, ponto; de perto (a partir do zoom em que os nomes aparecem), etiqueta. */
export function modoDoMarcador(zoom: number): 'ponto' | 'etiqueta' {
  return Math.round(zoom) >= ZOOM.sub ? 'etiqueta' : 'ponto';
}

const HASTE_MIN = 10;
const HASTE_MAX = 48;
const MEIO_PE = 4.5;
const MEIA_ALTURA_ETIQUETA = 17;

/** Posição de um círculo de score menos a do lugar, em px na tela. */
export interface Desvio { dx: number; dy: number }
type Lado = 'direita' | 'esquerda';

/** Distância do círculo no sentido em que a etiqueta abre (negativo: do outro lado). */
const naDirecao = (c: Desvio, lado: Lado) => (lado === 'direita' ? c.dx : -c.dx);
const naFaixa = (c: Desvio, raio: number) => Math.abs(c.dy) < raio + MEIA_ALTURA_ETIQUETA;

/** Haste que leva a etiqueta para além do círculo da própria região, quando ele está no caminho. */
function hasteParaLivrar(proprio: Desvio | undefined, lado: Lado, raio: number): number {
  if (!proprio || !naFaixa(proprio, raio)) return HASTE_MIN;
  return Math.max(HASTE_MIN, Math.ceil(naDirecao(proprio, lado) + raio + 2 - MEIO_PE));
}

function bate(c: Desvio, lado: Lado, haste: number, largura: number, raio: number): boolean {
  const s = naDirecao(c, lado);
  const inicio = MEIO_PE + haste;
  return naFaixa(c, raio) && s + raio > inicio && s - raio < inicio + largura;
}

/**
 * De perto, a etiqueta abre para o lado (F4b-P1): para cima, ela cobria o círculo de risco da
 * própria região, justamente o que a folha descreve. Prefere o lado oposto ao círculo da região;
 * se esse lado bate em algum círculo (o da região ou um vizinho), tenta o outro; se os dois batem,
 * fica no preferido. Quando o lugar está quase no centro da região, a haste cresce até passar do
 * círculo (no máximo 48 px; mais que isso, o lado conta como ocupado).
 */
export function posicaoDaEtiqueta(
  proprio: Desvio | undefined, outros: Desvio[], raio: number, largura: number,
): { lado: Lado; haste: number } {
  const preferido: Lado = proprio && proprio.dx > 0 ? 'esquerda' : 'direita';
  const todos = proprio ? [proprio, ...outros] : outros;
  for (const lado of [preferido, preferido === 'direita' ? 'esquerda' : 'direita'] as const) {
    const haste = hasteParaLivrar(proprio, lado, raio);
    if (haste <= HASTE_MAX && !todos.some((c) => bate(c, lado, haste, largura, raio))) return { lado, haste };
  }
  return { lado: preferido, haste: Math.min(HASTE_MAX, hasteParaLivrar(proprio, preferido, raio)) };
}

/** Mesmas faixas do aviso "começou a chover" (LimiaresNotificacao no backend). */
export function intensidadeChuva(mmH: number | null | undefined): 'fraca' | 'moderada' | 'forte' | null {
  if (mmH == null || mmH < 0.5) return null;
  if (mmH < 2.5) return 'fraca';
  if (mmH < 10) return 'moderada';
  return 'forte';
}

export function fraseChuvaAgora(mmH: number | null | undefined, temLeitura: boolean): string {
  if (!temLeitura) return 'Sem leitura agora';
  const i = intensidadeChuva(mmH);
  return i ? `Chuva ${i} agora` : 'Sem chuva agora';
}

/** O CGE não publica coordenada: o alagamento é da região, nunca "a X metros". */
export function fraseAlagamento(pontos: PontoAlagamentoCge[] | undefined, regiao: string): string {
  if (!pontos || pontos.length === 0) return `Nenhum alagamento agora ${emNomeDe(regiao)}`;
  const resto = pontos.length - 1;
  return `Alagamento agora: ${pontos[0].via}${resto > 0 ? ` e mais ${resto}` : ''}`;
}

/**
 * A frase embaixo da faixa: com risco, o porquê; sem risco, o que vem pela frente.
 * Lê o relógio aqui dentro, e não no corpo do componente, pela regra de pureza do React Compiler.
 */
export function fraseDoRisco(area: Area, faixas: FaixaPrevisaoDto[]): string {
  const s = area.scoreAtual;
  const l = area.ultimaLeitura;
  const motivo = s && motivoDoRisco({
    faixa: area.faixaRisco, perigoPrincipal: s.perigoPrincipal, chuva3hMm: s.chuva3hMm,
    ventoKmH: l?.ventoKmH, sensacaoTermica: l?.sensacaoTermica,
  });
  if (motivo) return motivo;
  return fraseChuvaForte(faixas, Date.now())
    ?? (faixas.length > 0 ? 'Sem chuva forte nas próximas horas' : 'Nada fora do normal agora');
}
