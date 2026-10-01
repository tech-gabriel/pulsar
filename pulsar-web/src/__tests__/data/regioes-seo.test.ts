import { describe, it, expect } from 'vitest';
import {
  zonas, subprefeituras, getZonaPorSlug, getSubprefeituraPorSlug, resolverDeepLink,
  regiaoPaths, slugify, PREFIXO_REGIAO,
} from '../../data/regioes-seo';

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

  it('cobre os 96 distritos oficiais, sem repetição', () => {
    const distritos = subprefeituras.flatMap((s) => s.distritos);
    expect(distritos).toHaveLength(96);
    expect(new Set(distritos).size).toBe(96);
  });

  it('gera slugs únicos, sem colidir com as zonas', () => {
    const slugs = [...zonas, ...subprefeituras].map((r) => r.slug);
    expect(new Set(slugs).size).toBe(37);
    expect(slugify("M'Boi Mirim")).toBe('mboi-mirim');
    expect(slugify('Aricanduva-Formosa-Carrão')).toBe('aricanduva-formosa-carrao');
    expect(getSubprefeituraPorSlug('se')?.nome).toBe('Sé');
  });

  it('usa a preposição certa em cada nome', () => {
    expect(getSubprefeituraPorSlug('mooca')).toMatchObject({ emNome: 'na Mooca', deNome: 'da Mooca' });
    expect(getSubprefeituraPorSlug('butanta')).toMatchObject({ emNome: 'no Butantã', deNome: 'do Butantã' });
    expect(getSubprefeituraPorSlug('itaquera')).toMatchObject({ emNome: 'em Itaquera', deNome: 'de Itaquera' });
  });

  it('textos curados não usam travessão (convenção de copy)', () => {
    for (const s of subprefeituras) expect(s.descricao).not.toMatch(/[—–]/);
  });

  it('resolve o deep-link de zona e de subprefeitura', () => {
    expect(resolverDeepLink('zona-leste')).toEqual({ nomeRegiao: 'Leste', nomeSub: null });
    expect(resolverDeepLink('itaquera')).toEqual({ nomeRegiao: 'Leste', nomeSub: 'Itaquera' });
    expect(resolverDeepLink('hackerman')).toBeUndefined();
  });

  it('gera os paths absolutos das 5 zonas + 32 subprefeituras', () => {
    expect(regiaoPaths()).toContain(`${PREFIXO_REGIAO}/zona-leste`);
    expect(regiaoPaths()).toContain(`${PREFIXO_REGIAO}/itaquera`);
    expect(regiaoPaths()).toHaveLength(37);
  });

  it('retorna undefined para slug inexistente', () => {
    expect(getZonaPorSlug('zona-inexistente')).toBeUndefined();
    expect(getSubprefeituraPorSlug('zona-leste')).toBeUndefined();
  });
});
