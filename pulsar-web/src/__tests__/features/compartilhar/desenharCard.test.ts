import { describe, it, expect } from 'vitest';
import { ajustarNome } from '../../../features/compartilhar/desenharCard';

const medir = (t: string, px: number) => t.length * px * 0.6;

describe('ajustarNome', () => {
  it('nome curto fica em 112 px numa linha', () => {
    expect(ajustarNome('Mooca', medir, 517)).toEqual({ px: 112, linhas: ['Mooca'] });
  });

  it('nome médio reduz a fonte até caber, sem quebrar', () => {
    // 12 caracteres: com o medidor falso (0,6 × px), cabe em 68 px numa linha.
    const r = ajustarNome('Vila Mariana', medir, 517);
    expect(r.linhas).toEqual(['Vila Mariana']);
    expect(r.px).toBeLessThan(112);
    expect(r.px).toBeGreaterThanOrEqual(64);
    expect(medir('Vila Mariana', r.px)).toBeLessThanOrEqual(517);
  });

  it('nome que não cabe em 64 px quebra em 2 linhas, no corte que permite a maior fonte', () => {
    const nome = 'Casa Verde-Limão-Cachoeirinha';
    const r = ajustarNome(nome, medir, 517);
    expect(r.linhas).toHaveLength(2);
    expect(r.px).toBeLessThan(64);
    expect(r.px).toBeGreaterThanOrEqual(40);
    for (const l of r.linhas) expect(medir(l, r.px)).toBeLessThanOrEqual(517);
    // Corte no hífen mantém o hífen no fim da 1ª linha; corte no espaço tira o espaço.
    expect(r.linhas[0] + (r.linhas[0].endsWith('-') ? '' : ' ') + r.linhas[1]).toBe(nome);
    expect(r.linhas).toEqual(['Casa Verde-Limão-', 'Cachoeirinha']);
  });
});
