import { describe, it, expect } from 'vitest';
import { zonas, getZonaPorSlug, zonaPaths, PREFIXO_REGIAO } from '../../data/regioes-seo';

describe('regioes-seo', () => {
  it('tem as 5 zonas com slugs e nomeRegiao corretos', () => {
    expect(zonas).toHaveLength(5);
    const slugs = zonas.map((z) => z.slug).sort();
    expect(slugs).toEqual(['zona-centro', 'zona-leste', 'zona-norte', 'zona-oeste', 'zona-sul']);
    const leste = getZonaPorSlug('zona-leste');
    expect(leste?.nomeRegiao).toBe('Leste');
    expect(leste?.nome).toBe('Zona Leste');
  });

  it('distribui as 32 subprefeituras entre as zonas', () => {
    const total = zonas.reduce((n, z) => n + z.subprefeituras.length, 0);
    expect(total).toBe(32);
    expect(getZonaPorSlug('zona-leste')?.subprefeituras).toContain('Mooca');
    expect(getZonaPorSlug('zona-oeste')?.subprefeituras).toContain('Butantã');
    expect(getZonaPorSlug('zona-centro')?.subprefeituras).toEqual(['Sé']);
  });

  it('gera os paths absolutos das zonas', () => {
    expect(zonaPaths()).toContain(`${PREFIXO_REGIAO}/zona-leste`);
    expect(zonaPaths()).toHaveLength(5);
  });

  it('retorna undefined para slug inexistente', () => {
    expect(getZonaPorSlug('zona-inexistente')).toBeUndefined();
  });
});
