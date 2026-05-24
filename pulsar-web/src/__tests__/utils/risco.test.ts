import { describe, it, expect } from 'vitest';
import { coresParaFaixa, labelFaixa, scoreFormatado } from '../../utils/risco';

describe('coresParaFaixa', () => {
  it('retorna cores verdes para BAIXO', () => {
    const c = coresParaFaixa('BAIXO');
    expect(c.bg).toBe('#D4EDDA');
    expect(c.text).toBe('#155724');
  });

  it('retorna cores amarelas para MODERADO', () => {
    const c = coresParaFaixa('MODERADO');
    expect(c.bg).toBe('#FFF3CD');
    expect(c.text).toBe('#856404');
  });

  it('retorna cores vermelhas para ALTO', () => {
    const c = coresParaFaixa('ALTO');
    expect(c.bg).toBe('#F8D7DA');
    expect(c.text).toBe('#721C24');
  });

  it('retorna SEM_DADO para null', () => {
    const c = coresParaFaixa(null);
    expect(c.bg).toBe('#F1F5F9');
  });

  it('retorna SEM_DADO para undefined', () => {
    const c = coresParaFaixa(undefined);
    expect(c.bg).toBe('#F1F5F9');
  });
});

describe('labelFaixa', () => {
  it.each([
    ['BAIXO' as const, 'Baixo'],
    ['MODERADO' as const, 'Moderado'],
    ['ALTO' as const, 'Alto'],
  ])('retorna "%s" para faixa %s', (faixa, esperado) => {
    expect(labelFaixa(faixa)).toBe(esperado);
  });

  it('retorna "Sem dados" para null', () => expect(labelFaixa(null)).toBe('Sem dados'));
  it('retorna "Sem dados" para undefined', () => expect(labelFaixa(undefined)).toBe('Sem dados'));
});

describe('scoreFormatado', () => {
  it('formata score com 1 decimal', () => expect(scoreFormatado(45.678)).toBe('45.7'));
  it('formata zero', () => expect(scoreFormatado(0)).toBe('0.0'));
  it('retorna "—" para null', () => expect(scoreFormatado(null)).toBe('—'));
  it('retorna "—" para undefined', () => expect(scoreFormatado(undefined)).toBe('—'));
});
