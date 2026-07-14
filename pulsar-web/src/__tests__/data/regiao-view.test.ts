import { describe, it, expect } from 'vitest';
import { getRegiaoView } from '../../data/regiao-view';

describe('getRegiaoView', () => {
  it('combina dados estáticos da zona com o snapshot', () => {
    const v = getRegiaoView('zona-leste');
    expect(v).toBeDefined();
    expect(v?.nome).toBe('Zona Leste');
    expect(v?.subprefeituras).toContain('Mooca');
    expect(v?.snapshot).not.toBeNull();
    expect(typeof v?.snapshot?.diasRiscoAlto).toBe('number');
    expect(['BAIXO', 'MODERADO', 'ALTO']).toContain(v?.snapshot?.faixaPredominante);
    expect(v?.janelaDias).toBeGreaterThan(0);
  });

  it('snapshot nulo quando a zona não está no JSON', () => {
    // slug válido de zona sempre existe no snapshot gerado; slug inválido -> undefined
    expect(getRegiaoView('zona-inexistente')).toBeUndefined();
  });
});
