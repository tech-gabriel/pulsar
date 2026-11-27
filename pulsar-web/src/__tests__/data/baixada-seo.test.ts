import { describe, expect, it } from 'vitest';
import { ATALHOS_BAIXADA, buscarMunicipio, getMunicipioPorSlug, municipios, numerosDe } from '../../data/baixada-seo';
import { subprefeituras, zonas } from '../../data/regioes-seo';

describe('baixada-seo', () => {
  it('Santos tem 129 de 397 trechos e 7 pontos', () => {
    expect(numerosDe('santos')).toEqual({ trechos: 397, trechosRisco: 129, pontos: 7 });
  });

  it('soma da Baixada bate com a grade', () => {
    const todos = municipios.map((m) => numerosDe(m.slug)!);
    const soma = (k: 'trechos' | 'trechosRisco' | 'pontos') => todos.reduce((s, n) => s + n[k], 0);
    expect(municipios).toHaveLength(9);
    expect([soma('trechos'), soma('trechosRisco'), soma('pontos')]).toEqual([3587, 906, 15]);
  });

  it('acha sem acento e parcial', () => {
    expect(buscarMunicipio('sao vicente')[0].nome).toBe('São Vicente');
    expect(buscarMunicipio('guaruja')[0].nome).toBe('Guarujá');
    expect(buscarMunicipio('praia').map((m) => m.nome)).toContain('Praia Grande');
    expect(buscarMunicipio('x')).toEqual([]);
  });

  it('nenhum slug colide com zona ou subprefeitura', () => {
    const usados = new Set([...zonas, ...subprefeituras].map((s) => s.slug));
    expect(municipios.filter((m) => usados.has(m.slug))).toEqual([]);
  });

  it('Guarujá leva "no"; os atalhos existem', () => {
    expect(getMunicipioPorSlug('guaruja')!.emNome).toBe('no Guarujá');
    expect(getMunicipioPorSlug('guaruja')!.deNome).toBe('do Guarujá');
    expect(getMunicipioPorSlug('santos')!.emNome).toBe('em Santos');
    expect(ATALHOS_BAIXADA.every((s) => getMunicipioPorSlug(s))).toBe(true);
  });
});
