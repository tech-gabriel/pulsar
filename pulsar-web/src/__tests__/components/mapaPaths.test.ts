import { describe, it, expect } from 'vitest';
import { SUBPREFEITURAS, VIEWBOX } from '../../components/landing/mapaPaths';

describe('mapaPaths (gerado por scripts/gerar-mapa-svg.mjs)', () => {
  it('traz as 32 subprefeituras de São Paulo', () => {
    expect(SUBPREFEITURAS).toHaveLength(32);
  });

  it('cada subprefeitura tem id, nome, zona e path preenchidos', () => {
    for (const s of SUBPREFEITURAS) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.nome.length).toBeGreaterThan(0);
      expect(s.zona.length).toBeGreaterThan(0);
      expect(s.d.startsWith('M')).toBe(true);
    }
  });

  it('não repete id', () => {
    const ids = SUBPREFEITURAS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('expõe um viewBox válido', () => {
    expect(VIEWBOX).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
  });

  it('cabe no orçamento de 60 KB de paths', () => {
    const bytes = SUBPREFEITURAS.reduce((t, s) => t + s.d.length, 0);
    expect(bytes).toBeLessThan(60_000);
  });
});
