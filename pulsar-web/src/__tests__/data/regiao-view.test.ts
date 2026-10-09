import { describe, it, expect } from 'vitest';
import { getRegiaoView, getSubprefeituraView } from '../../data/regiao-view';
import snapshot from '../../data/regioes-snapshot.json';

describe('regiao-view', () => {
  it('zona: dados estáticos + estatísticas do snapshot (ou null)', () => {
    const v = getRegiaoView('zona-leste');
    expect(v?.nome).toBe('Zona Leste');
    expect(v?.subprefeituras).toContain('Mooca');
    expect('zona-leste' in snapshot.zonas).toBe(true);
    if (v?.estatisticas) {
      expect(v.estatisticas.janelaDias).toBe(snapshot.janelaDias);
      expect(v.estatisticas.atualizadoEm).toBe(snapshot.geradoEm);
    } else {
      expect(v?.estatisticas).toBeNull();
    }
  });

  it('subprefeitura: expõe estatisticas pelo slug', () => {
    const v = getSubprefeituraView('mooca');
    expect(v).toBeDefined();
    expect(v && 'estatisticas' in v).toBe(true);
  });

  it('slug inválido -> undefined', () => {
    expect(getRegiaoView('zona-inexistente')).toBeUndefined();
  });
});
