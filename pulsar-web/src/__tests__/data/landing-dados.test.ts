import { describe, it, expect } from 'vitest';
import { buscarRegiao, posicaoDe, totalDe, TOTAL_ALAGAMENTOS } from '../../data/landing-dados';
import { subprefeituras } from '../../data/regioes-seo';

describe('landing-dados', () => {
  it('acha o bairro sem acento e devolve a subprefeitura dele', () => {
    const r = buscarRegiao('jabaquara');
    expect(r[0]).toMatchObject({ slug: 'jabaquara' });
    expect(buscarRegiao('consolacao')[0]).toMatchObject({ rotulo: 'Consolação', slug: 'se' });
  });

  it('ignora busca de uma letra', () => {
    expect(buscarRegiao('a')).toEqual([]);
  });

  it('o ranking vai de 1 a 32 e o primeiro é o de mais registros', () => {
    const posicoes = subprefeituras.map((s) => posicaoDe(s.slug));
    expect(Math.min(...posicoes)).toBe(1);
    expect(Math.max(...posicoes)).toBeLessThanOrEqual(32);
    const primeiro = subprefeituras.find((s) => posicaoDe(s.slug) === 1)!;
    expect(subprefeituras.every((s) => totalDe(s.slug) <= totalDe(primeiro.slug))).toBe(true);
  });

  it('o total da cidade é a soma das subprefeituras', () => {
    expect(TOTAL_ALAGAMENTOS).toBe(subprefeituras.reduce((a, s) => a + totalDe(s.slug), 0));
  });
});
