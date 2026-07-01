import { describe, it, expect } from 'vitest';
import { CHANGELOG, APP_VERSION } from '../../data/changelog';
import { INSTAGRAM_URL } from '../../data/social';

describe('changelog data', () => {
  it('APP_VERSION é a versão do release mais recente', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].versao);
  });

  it('todo release tem versão SemVer, data ISO e ao menos um item', () => {
    for (const r of CHANGELOG) {
      expect(r.versao).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.itens.length).toBeGreaterThan(0);
      for (const i of r.itens) {
        expect(['novo', 'melhoria', 'correcao']).toContain(i.tipo);
        expect(i.titulo.length).toBeGreaterThan(0);
      }
    }
  });

  it('INSTAGRAM_URL aponta para @appulsar', () => {
    expect(INSTAGRAM_URL).toBe('https://instagram.com/appulsar');
  });
});
