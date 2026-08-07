import { describe, it, expect } from 'vitest';
import { contrasteComBranco, fundoParaTextoBranco, luminancia, opaca } from '../../utils/contraste';

// Toda cor que pode virar fundo de um número branco no app: faixas de risco,
// camadas climáticas e "sem dado".
const FUNDOS = [
  '#22c55e', // baixo / UV baixo
  '#f59e0b', // moderado
  '#ef4444', // alto
  '#94a3b8', // sem dado
  '#eab308', // vento/UV médio
  '#3b82f6', // chuva
  '#1d4ed8', // chuva forte
  '#9333ea', // UV extremo
];

/** Matiz aproximado (0–360) para checar que escurecer não muda a cor percebida. */
function matiz(cor: string): number {
  const [r, g, b] = cor.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function paraRgbString(hex: string): string {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
}

describe('opaca', () => {
  it('remove o alpha de uma cor rgba', () => {
    expect(opaca('rgba(34, 197, 94, 0.85)')).toBe('rgba(34, 197, 94, 1)');
  });

  it('devolve hex inalterado', () => {
    expect(opaca('#22c55e')).toBe('#22c55e');
  });
});

describe('luminancia', () => {
  it('vai de 0 no preto a 1 no branco', () => {
    expect(luminancia('#000000')).toBeCloseTo(0, 5);
    expect(luminancia('#ffffff')).toBeCloseTo(1, 5);
  });

  it('lê hex curto, rgb e rgba', () => {
    expect(luminancia('#fff')).toBeCloseTo(1, 5);
    expect(luminancia('rgb(255, 255, 255)')).toBeCloseTo(1, 5);
    expect(luminancia('rgba(255, 255, 255, 0.5)')).toBeCloseTo(1, 5);
  });
});

describe('fundoParaTextoBranco', () => {
  it.each(FUNDOS)('deixa o branco passar de 4,5:1 sobre %s', (cor) => {
    expect(contrasteComBranco(fundoParaTextoBranco(cor))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(FUNDOS)('preserva o matiz de %s', (cor) => {
    const antes = matiz(paraRgbString(cor));
    const depois = matiz(fundoParaTextoBranco(cor));
    // Escurecer multiplica os canais pelo mesmo fator, então o matiz só varia
    // pelo arredondamento para inteiro.
    expect(Math.abs(antes - depois)).toBeLessThan(6);
  });

  it('escurece o verde de risco baixo, que sozinho falha com branco', () => {
    expect(contrasteComBranco('#22c55e')).toBeLessThan(4.5);
    expect(contrasteComBranco(fundoParaTextoBranco('#22c55e'))).toBeGreaterThanOrEqual(4.5);
  });

  it('não mexe em cor que já passa', () => {
    const escura = '#1d4ed8';
    expect(contrasteComBranco(escura)).toBeGreaterThanOrEqual(4.5);
    expect(fundoParaTextoBranco(escura)).toBe(paraRgbString(escura));
  });

  it('aceita um mínimo customizado', () => {
    expect(contrasteComBranco(fundoParaTextoBranco('#22c55e', 7))).toBeGreaterThanOrEqual(7);
  });
});
