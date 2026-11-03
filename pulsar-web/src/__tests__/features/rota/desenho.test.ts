import { describe, it, expect } from 'vitest';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { chaveGeometria, cortarRota } from '../../../features/rota/desenho';

const linha = (coords: number[][], cor: string): Feature => ({ type: 'Feature', properties: { cor }, geometry: { type: 'LineString', coordinates: coords } });
const ponto = (c: number[], papel: string): Feature => ({ type: 'Feature', properties: { papel }, geometry: { type: 'Point', coordinates: c } });

// Dois trechos do mesmo tamanho: o segundo começa onde o primeiro termina.
const rota: FeatureCollection = {
  type: 'FeatureCollection',
  features: [linha([[0, 0], [1, 0]], 'verde'), linha([[1, 0], [2, 0]], 'vermelho'), ponto([0, 0], 'origem'), ponto([2, 0], 'destino')],
};
const linhas = (fc: FeatureCollection) => fc.features.filter((f) => f.geometry.type === 'LineString') as Feature<LineString>[];
const papeis = (fc: FeatureCollection) => fc.features.map((f) => f.properties?.papel).filter(Boolean);

describe('cortarRota', () => {
  it('no começo só os pontos, sem linha nem entrada', () => {
    const r = cortarRota(rota, 0);
    expect(linhas(r)).toHaveLength(0);
    expect(papeis(r)).toEqual(['origem', 'destino']);
  });

  it('na metade do primeiro trecho corta a linha no meio', () => {
    const [l] = linhas(cortarRota(rota, 0.25));
    expect(l.geometry.coordinates.at(-1)![0]).toBeCloseTo(0.5);
    expect(linhas(cortarRota(rota, 0.25))).toHaveLength(1);
  });

  it('ao passar a divisa marca a entrada na cor do trecho novo', () => {
    const r = cortarRota(rota, 0.75);
    expect(linhas(r)).toHaveLength(2);
    expect(r.features.find((f) => f.properties?.papel === 'entrada')?.properties?.cor).toBe('vermelho');
  });

  it('inteira devolve os trechos originais', () => {
    expect(linhas(cortarRota(rota, 1)).map((l) => l.geometry.coordinates)).toEqual([[[0, 0], [1, 0]], [[1, 0], [2, 0]]]);
  });

  it('a chave só muda com os pontos, não com a cor', () => {
    const outraCor = { ...rota, features: [linha([[0, 0], [1, 0]], 'cinza'), ...rota.features.slice(1)] };
    expect(chaveGeometria(outraCor)).toBe(chaveGeometria(rota));
  });
});
