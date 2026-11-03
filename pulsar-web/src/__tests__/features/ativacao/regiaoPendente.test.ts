import { describe, it, expect, beforeEach } from 'vitest';
import { guardarRegiaoPendente, lerRegiaoPendente, limparRegiaoPendente } from '../../../features/ativacao/regiaoPendente';

describe('regiaoPendente', () => {
  beforeEach(() => localStorage.clear());

  it('guarda e lê o slug de uma subprefeitura', () => {
    guardarRegiaoPendente('mooca', 1000);
    expect(lerRegiaoPendente(2000)).toBe('mooca');
  });

  it('zona e slug inválido não são guardados', () => {
    guardarRegiaoPendente('zona-leste', 1000);
    expect(lerRegiaoPendente(1000)).toBeNull();
    guardarRegiaoPendente('nao-existe', 1000);
    expect(lerRegiaoPendente(1000)).toBeNull();
  });

  it('vence depois de 24 h e limpa', () => {
    guardarRegiaoPendente('penha', 0);
    expect(lerRegiaoPendente(24 * 60 * 60 * 1000)).toBe('penha');
    expect(lerRegiaoPendente(24 * 60 * 60 * 1000 + 1)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('limpar apaga', () => {
    guardarRegiaoPendente('penha', 0);
    limparRegiaoPendente();
    expect(lerRegiaoPendente(0)).toBeNull();
  });
});
