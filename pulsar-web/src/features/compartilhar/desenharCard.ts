import type { GeometriaArea } from '../cidade/cidade';
import type { DadosCard } from './dadosDoCard';

export const LARGURA_CARD = 1080;
export const ALTURA_CARD = 1350;
const M = 80;
const ALTURA_MAPA = 560;
const LARGURA_MAPA = (ALTURA_MAPA * 1000) / 1542.3; // viewBox do mapa: 1000 x 1542.3
const LARGURA_TEXTO = LARGURA_CARD - 2 * M - LARGURA_MAPA - 40; // ~517: não invade o mapa
const COR = { ALTO: '#EF4444', MODERADO: '#F59E0B', BAIXO: '#22C55E' } as const;
const GROTESK = (peso: number, px: number) => `${peso} ${px}px "Space Grotesk"`;
const MONO = (peso: number, px: number) => `${peso} ${px}px "JetBrains Mono"`;

/** Quebra por palavra para caber na largura. */
function quebra(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let linha = '';
  for (const p of texto.split(' ')) {
    const t = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(t).width > largura && linha) { linhas.push(linha); linha = p; } else linha = t;
  }
  if (linha) linhas.push(linha);
  return linhas;
}

/**
 * Nome grande sem invadir o mapa: numa linha, reduz de 112 até 64 px. Se não couber, quebra
 * em 2 linhas (no espaço ou no hífen) escolhendo o corte que permite a MAIOR fonte com as
 * duas linhas cabendo, até o mínimo de 40 px. Nomes como "Casa Verde-Limão-Cachoeirinha"
 * não cabem em 64 px nem quebrados, por isso o mínimo de 2 linhas é menor.
 */
export function ajustarNome(nome: string, medir: (texto: string, px: number) => number, largura: number) {
  for (let px = 112; px >= 64; px -= 4) {
    if (medir(nome, px) <= largura) return { px, linhas: [nome] };
  }
  let melhor = { px: 0, linhas: [nome] };
  for (const m of nome.matchAll(/[ -]/g)) {
    const corte = m.index! + 1;
    const linhas = [nome.slice(0, corte).trimEnd(), nome.slice(corte)];
    let px = 112;
    while (px > 40 && linhas.some((l) => medir(l, px) > largura)) px -= 4;
    if (px > melhor.px) melhor = { px, linhas };
  }
  return melhor.px ? melhor : { px: 40, linhas: [nome] };
}

export function desenharCard(canvas: HTMLCanvasElement, dados: DadosCard, areas: GeometriaArea[]): void {
  canvas.width = LARGURA_CARD;
  canvas.height = ALTURA_CARD;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas 2D indisponível.');
  const W = LARGURA_CARD, H = ALTURA_CARD, cor = COR[dados.faixa];

  // Fundo radar noturno (PADRAO-FEED.md).
  const g = c.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.45, 900);
  g.addColorStop(0, '#06223A'); g.addColorStop(1, '#020B14');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,188,255,.07)'; c.lineWidth = 1;
  for (let x = 0; x < W; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 44) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  // Topo.
  c.font = MONO(700, 30); c.fillStyle = '#9FE3FF';
  c.fillText(`PULSAR · ${dados.topo}`, M, M + 20);
  c.textAlign = 'right'; c.fillText(dados.horario, W - M, M + 20); c.textAlign = 'left';

  // Mapa à direita, a área da subprefeitura na cor da faixa.
  const s = ALTURA_MAPA / 1542.3;
  c.save(); c.translate(W - M - LARGURA_MAPA, 190); c.scale(s, s);
  for (const a of areas) {
    const p = new Path2D(a.d);
    c.fillStyle = a.id === dados.idArea ? cor : 'rgba(159,227,255,.16)';
    c.fill(p);
    c.lineWidth = 6; c.strokeStyle = '#04182A'; c.stroke(p);
  }
  c.restore();

  // Nome e legenda.
  const medir = (t: string, px: number) => { c.font = GROTESK(700, px); return c.measureText(t).width; };
  const nome = ajustarNome(dados.nome, medir, LARGURA_TEXTO);
  c.font = GROTESK(700, nome.px); c.fillStyle = '#E6F7FF';
  // A última linha do nome fica sempre na mesma altura (300), acima da legenda.
  let y = 300 - (nome.linhas.length - 1) * nome.px * 1.02;
  for (const l of nome.linhas) { c.fillText(l, M, y); y += nome.px * 1.02; }
  c.font = MONO(500, 30); c.fillStyle = '#9FE3FF';
  c.fillText(dados.legenda, M, 352);

  // Pílula da faixa, com brilho.
  c.font = GROTESK(700, 54);
  const wp = c.measureText(dados.rotuloFaixa).width + 64;
  c.shadowColor = cor; c.shadowBlur = 30;
  c.fillStyle = `${cor}26`; c.beginPath(); c.roundRect(M, 410, wp, 96, 48); c.fill();
  c.fillStyle = cor; c.textBaseline = 'middle'; c.fillText(dados.rotuloFaixa, M + 32, 410 + 50);
  c.shadowBlur = 0; c.textBaseline = 'alphabetic';

  // Perigo e dado.
  y = 590;
  if (dados.perigo) { c.font = GROTESK(700, 40); c.fillStyle = '#E6F7FF'; c.fillText(dados.perigo, M, y); y += 52; }
  c.font = GROTESK(500, 34); c.fillStyle = '#9FE3FF';
  for (const l of quebra(c, dados.dado, LARGURA_TEXTO)) { c.fillText(l, M, y); y += 46; }

  // Caixa: dica ou "Fique avisado".
  const bx = M, by = 820, bw = W - 2 * M, bh = 300;
  c.fillStyle = 'rgba(0,188,255,.08)'; c.strokeStyle = 'rgba(0,188,255,.45)'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(bx, by, bw, bh, 24); c.fill(); c.stroke();
  c.font = MONO(700, 26); c.fillStyle = '#00BCFF'; c.fillText(dados.caixa.rotulo, bx + 40, by + 62);
  c.font = GROTESK(700, 48); c.fillStyle = '#E6F7FF'; c.fillText(dados.caixa.titulo, bx + 40, by + 128);
  c.font = GROTESK(500, 32); c.fillStyle = '#9FE3FF';
  let yy = by + 182;
  for (const l of quebra(c, dados.caixa.texto, bw - 80).slice(0, 3)) { c.fillText(l, bx + 40, yy); yy += 44; }

  // Rodapé.
  c.strokeStyle = 'rgba(0,188,255,.25)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(M, H - 150); c.lineTo(W - M, H - 150); c.stroke();
  c.font = GROTESK(700, 34); c.fillStyle = '#E6F7FF'; c.fillText('Acompanhe a sua subprefeitura', M, H - 96);
  c.font = MONO(700, 30); c.fillStyle = '#00BCFF';
  c.textAlign = 'right'; c.fillText('APP-PULSAR.COM.BR', W - M, H - 96); c.textAlign = 'left';
  c.font = MONO(500, 22); c.fillStyle = 'rgba(159,227,255,.7)';
  c.fillText('ESTIMATIVA DO PULSAR · EMERGÊNCIA: 199 OU 193', M, H - 52);
}
