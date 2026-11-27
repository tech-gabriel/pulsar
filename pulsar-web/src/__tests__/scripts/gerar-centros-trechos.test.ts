import { describe, it, expect } from 'vitest';
// @ts-expect-error script .mjs sem tipos
import { centrosDaGrade } from '../../../scripts/gerar-centros-trechos.mjs';

describe('gerar-centros-trechos: centrosDaGrade', () => {
  it('devolve a média dos 6 vértices (5 casas) por h3 e ignora feature sem h3', () => {
    const hex = [[0, 0], [2, 0], [3, 1], [2, 2], [0, 2], [-1, 1]];
    const grade = {
      features: [
        { properties: { h3: 'abc' }, geometry: { coordinates: [[...hex, hex[0]]] } },
        { properties: {}, geometry: { coordinates: [[...hex, hex[0]]] } },
      ],
    };
    expect(centrosDaGrade(grade)).toEqual({ abc: [1, 1] });
  });

  it('arredonda a 5 casas', () => {
    const p = [[0, 0], [1, 0], [1, 0], [0, 0], [0, 0], [0, 1]];
    const out = centrosDaGrade({ features: [{ properties: { h3: 'x' }, geometry: { coordinates: [[...p, p[0]]] } }] });
    expect(out.x).toEqual([0.33333, 0.16667]);
  });
});
