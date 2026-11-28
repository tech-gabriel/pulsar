import { describe, expect, it } from 'vitest';
import { escolherFrase } from '../../utils/frase';

// Cada letra mede 8 px.
const medir = (t: string) => t.length * 8;
const frases = ['1 em alerta, 2 em atenção · Casa em Atenção', '1 em alerta, 2 em atenção · Casa: Atenção', '1 alerta, 2 atenção · Casa: Atenção'];

describe('escolherFrase', () => {
  it('a primeira que cabe inteira na largura, sem cortar', () => {
    expect(escolherFrase(frases, 400, medir)).toEqual({ texto: frases[0], escala: 1 });
    expect(escolherFrase(frases, 340, medir)).toEqual({ texto: frases[1], escala: 1 });
    expect(escolherFrase(frases, 290, medir)).toEqual({ texto: frases[2], escala: 1 });
  });
  it('nem a mais curta cabe: a letra diminui o necessario para caber, nunca abaixo de 80%', () => {
    expect(escolherFrase(frases, 252, medir)).toEqual({ texto: frases[2], escala: 0.9 });
    expect(escolherFrase(frases, 100, medir).escala).toBe(0.8);
  });
  it('sem largura medida (antes do layout) fica com a mais longa', () => {
    expect(escolherFrase(frases, null, medir)).toEqual({ texto: frases[0], escala: 1 });
  });
});
