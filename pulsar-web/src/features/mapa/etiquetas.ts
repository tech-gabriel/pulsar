import type { SubprefeituraMapaDto } from '../../types';
import { nomeAbreviado } from '../../utils/nomesSub';
import { nivelDaArea, type CamadaMapa } from './nivel';

export interface Etiqueta {
  areaId: string;
  nome: string;
  nivel: 'atencao' | 'alerta';
  perigo: 'chuva' | 'calor' | 'vento';
  valor: string;
  /** A frase inteira: vai para o leitor de tela e para o cartão. */
  motivo: string;
  /** O número que faz agir, para a etiqueta de perto (1B, 28/11): "38 mm em 3 h". */
  curto: string;
  lon: number;
  lat: number;
}

export interface Caixa { x: number; y: number; w: number; h: number }

/** "4,2" -> 4.2, "32°" -> 32. */
const numero = (valor: string) => parseFloat(valor.replace('°', '').replace(',', '.')) || 0;

function motivoCurto(a: SubprefeituraMapaDto, perigo: Etiqueta['perigo']): string {
  const l = a.ultimaLeitura;
  if (perigo === 'calor') return `Sensação ${Math.round(l?.sensacaoTermica ?? 0)} °C`;
  if (perigo === 'vento') return `Vento ${Math.round(l?.ventoKmH ?? 0)} km/h`;
  // A medida das estações manda quando existe, como na frase longa (motivoDoRisco).
  const s = a.scoreAtual;
  const mm = (s?.chuva3hMedidaMm ?? 0) > 0 ? s!.chuva3hMedidaMm! : (s?.chuva3hMm ?? 0);
  return `${Math.round(mm)} mm em 3 h`;
}

export function etiquetasDaCamada(areas: SubprefeituraMapaDto[], camada: CamadaMapa): Etiqueta[] {
  const itens: { e: Etiqueta; n: number }[] = [];
  for (const a of areas) {
    const n = nivelDaArea(a, camada);
    if ((n.nivel !== 'atencao' && n.nivel !== 'alerta') || !n.perigo || n.valor == null || n.motivo == null) continue;
    const nota = camada === 'score' && a.scoreAtual ? a.scoreAtual.valor : numero(n.valor);
    itens.push({
      e: { areaId: a.id, nome: nomeAbreviado(a.nome), nivel: n.nivel, perigo: n.perigo, valor: n.valor, motivo: n.motivo, curto: motivoCurto(a, n.perigo), lon: a.longitude, lat: a.latitude },
      n: nota,
    });
  }
  const peso = (e: Etiqueta) => (e.nivel === 'alerta' ? 1 : 0);
  return itens.sort((x, y) => peso(y.e) - peso(x.e) || y.n - x.n).map((i) => i.e);
}

export function compacta(zoom: number): boolean {
  return zoom < 11.5;
}

/**
 * Distância entre o ponto da área e a borda da etiqueta quando ela sai do centro: o raio do pino
 * de Casa e Trabalho (22 px, toque de 44) mais a folga. Menos que isso, os quatro lados batiam
 * no pino e a área em Alerta debaixo dele sumia.
 */
const AFASTAMENTO = 26;

/**
 * Cada etiqueta tenta o centro da área e, se bater em algo (pino de Casa ou Trabalho, outra
 * etiqueta, borda da tela), os quatro lados: acima, abaixo, à direita, à esquerda. Quem cede é a
 * etiqueta, nunca o pino (regra de 17/11). Sem lado livre, ela fica oculta e quem chama mostra o
 * pulsar com a nota no lugar. `desvios` diz quanto cada mostrada saiu do centro, em px.
 */
export function colocarEtiquetas(
  itens: { etiqueta: Etiqueta; caixa: Caixa }[],
  bloqueios: Caixa[],
  tela: { w: number; h: number },
  folga = 4,
  /** O que a página põe por cima do mapa (busca, botões, cartão de baixo): lugar coberto não vale. */
  coberta: (c: Caixa) => boolean = () => false,
): { mostradas: Etiqueta[]; ocultas: Etiqueta[]; desvios: Record<string, { x: number; y: number }> } {
  const bate = (a: Caixa, b: Caixa) =>
    a.x < b.x + b.w + folga && b.x < a.x + a.w + folga && a.y < b.y + b.h + folga && b.y < a.y + a.h + folga;
  const fora = (c: Caixa) => c.x < 0 || c.y < 0 || c.x + c.w > tela.w || c.y + c.h > tela.h;
  // Alerta primeiro (sort estável mantém a ordem do chamador dentro do nível).
  const ordem = [...itens].sort((a, b) => Number(b.etiqueta.nivel === 'alerta') - Number(a.etiqueta.nivel === 'alerta'));
  const ocupadas = [...bloqueios];
  const mostradas: Etiqueta[] = [];
  const ocultas: Etiqueta[] = [];
  const desvios: Record<string, { x: number; y: number }> = {};
  for (const { etiqueta, caixa } of ordem) {
    const dy = caixa.h / 2 + AFASTAMENTO;
    const dx = caixa.w / 2 + AFASTAMENTO;
    const lugar = [{ x: 0, y: 0 }, { x: 0, y: -dy }, { x: 0, y: dy }, { x: dx, y: 0 }, { x: -dx, y: 0 }]
      .map((d) => ({ d, c: { ...caixa, x: caixa.x + d.x, y: caixa.y + d.y } }))
      .find(({ c }) => !fora(c) && !ocupadas.some((o) => bate(c, o)) && !coberta(c));
    if (!lugar) { ocultas.push(etiqueta); continue; }
    ocupadas.push(lugar.c);
    mostradas.push(etiqueta);
    desvios[etiqueta.areaId] = lugar.d;
  }
  return { mostradas, ocultas, desvios };
}
