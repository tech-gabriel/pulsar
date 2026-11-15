import { describe, it, expect } from 'vitest';
import { elastico, paradaDaFolha, projetar } from '../../motion/useArrastoFolha';

describe('arrasto da folha do detalhe', () => {
  it('projetar: um peteleco de 1000 px/s ainda anda cerca de 499 px', () => {
    expect(projetar(1000)).toBeCloseTo(499, 0);
    expect(projetar(0)).toBe(0);
    expect(projetar(-1000)).toBeCloseTo(-499, 0);
  });

  it('elastico: acompanha o dedo cada vez menos e nunca passa dele', () => {
    expect(elastico(0, 500)).toBe(0);
    expect(elastico(100, 500)).toBeGreaterThan(0);
    expect(elastico(100, 500)).toBeLessThan(100);
    expect(elastico(400, 500) - elastico(300, 500)).toBeLessThan(elastico(100, 500));
  });

  it('paradaDaFolha: fecha bem abaixo da curta; senão a parada mais próxima', () => {
    expect(paradaDaFolha(100, 270, 690)).toBe('fechar');
    expect(paradaDaFolha(200, 270, 690)).toBe('curta');
    expect(paradaDaFolha(300, 270, 690)).toBe('curta');
    expect(paradaDaFolha(600, 270, 690)).toBe('aberta');
    expect(paradaDaFolha(900, 270, 690)).toBe('aberta');
  });
});
