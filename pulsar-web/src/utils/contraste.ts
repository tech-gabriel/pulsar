// ── Contraste sobre as cores de faixa ─────────────────────────────────────────
// As cores de risco (verde #22c55e, âmbar #f59e0b, vermelho #ef4444) são claras
// demais para receber texto branco: o par branco/verde fica em 2,3:1, bem
// abaixo do mínimo de 4,5:1 para texto pequeno. Em vez de trocar a cor do texto
// (que deixava os números escuros e pesados), a solução é escurecer o fundo o
// suficiente para o branco passar, mantendo o matiz da faixa.

/** Converte `#rgb`, `#rrggbb`, `rgb()` ou `rgba()` em `[r, g, b]` 0–255. */
function paraRgb(cor: string): [number, number, number] | null {
  if (cor.startsWith('#')) {
    const hex = cor.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    if (full.length < 6) return null;
    const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return rgb.some(Number.isNaN) ? null : (rgb as [number, number, number]);
  }
  const nums = cor.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return null;
  const rgb = nums.slice(0, 3).map(Number);
  return rgb.some(Number.isNaN) ? null : (rgb as [number, number, number]);
}

function luminanciaDeRgb([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Torna opaca uma cor `rgba(...)`; devolve inalterada qualquer outra notação. */
export function opaca(cor: string): string {
  return cor.startsWith('rgba(') ? cor.replace(/[\d.]+\)$/, '1)') : cor;
}

/** Luminância relativa (WCAG) de uma cor. */
export function luminancia(cor: string): number {
  const rgb = paraRgb(cor);
  return rgb ? luminanciaDeRgb(rgb) : 0;
}

/** Razão de contraste (WCAG) entre o branco e uma cor de fundo. */
export function contrasteComBranco(fundo: string): number {
  const rgb = paraRgb(fundo);
  if (!rgb) return 1;
  return 1.05 / (luminanciaDeRgb(rgb) + 0.05);
}

/**
 * Escurece `cor` em degraus até que texto branco por cima atinja `minimo` de
 * contraste, preservando o matiz. O verde de risco baixo, por exemplo, sai de
 * #22c55e (branco em 2,3:1) para um verde mais fechado que passa de 4,5:1 —
 * continua verde, continua lendo como "baixo", e o número volta a ser branco.
 */
export function fundoParaTextoBranco(cor: string, minimo = 4.5): string {
  const rgb = paraRgb(cor);
  if (!rgb) return cor;

  for (let fator = 1; fator > 0; fator -= 0.02) {
    const escurecida: [number, number, number] = [
      Math.round(rgb[0] * fator),
      Math.round(rgb[1] * fator),
      Math.round(rgb[2] * fator),
    ];
    if (1.05 / (luminanciaDeRgb(escurecida) + 0.05) >= minimo) {
      return `rgb(${escurecida[0]}, ${escurecida[1]}, ${escurecida[2]})`;
    }
  }
  return '#000000';
}
