import { describe, expect, it } from 'vitest';
import { km, nomeEstacao } from '../../utils/chuvaMedida';

describe('formato da chuva medida', () => {
  it('km sempre com uma casa', () => {
    expect(km(2)).toBe('2,0 km');
    expect(km(0.37)).toBe('0,4 km');
  });
  it('nome da estação ganha espaço antes do número final', () => {
    expect(nomeEstacao('Penha3')).toBe('Penha 3');
    expect(nomeEstacao('Vila Ema')).toBe('Vila Ema');
    expect(nomeEstacao('Penha 3')).toBe('Penha 3');
  });
});
