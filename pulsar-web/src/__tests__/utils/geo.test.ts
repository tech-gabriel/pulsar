import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { pontoEmPoligono, resolverRegiaoPorPonto } from '../../utils/geo';

// FeatureCollection mínima: um quadrado [-46.7,-23.6] a [-46.5,-23.4]
// (coordenadas GeoJSON em [lon, lat]) com nomes oficiais embutidos.
const geojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { nm_subprefeitura: 'SE', nm_regiao_05: 'Centro' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-46.7, -23.6],
            [-46.5, -23.6],
            [-46.5, -23.4],
            [-46.7, -23.4],
            [-46.7, -23.6],
          ],
        ],
      },
    },
  ],
};

describe('pontoEmPoligono', () => {
  it('retorna a feature quando o ponto está dentro do polígono', () => {
    const feature = pontoEmPoligono(-23.5, -46.6, geojson);
    expect(feature).not.toBeNull();
    expect(feature?.properties?.nm_subprefeitura).toBe('SE');
  });

  it('retorna null quando o ponto está fora do polígono', () => {
    expect(pontoEmPoligono(-23.9, -46.9, geojson)).toBeNull();
  });

  it('retorna null para geojson nulo', () => {
    expect(pontoEmPoligono(-23.5, -46.6, null)).toBeNull();
  });
});

describe('resolverRegiaoPorPonto', () => {
  it('resolve subprefeitura e região a partir das props do GeoJSON', () => {
    const r = resolverRegiaoPorPonto(-23.5, -46.6, geojson);
    expect(r).toEqual({ subprefeituraNome: 'SE', regiaoNome: 'Centro' });
  });

  it('retorna null fora de qualquer polígono', () => {
    expect(resolverRegiaoPorPonto(-23.9, -46.9, geojson)).toBeNull();
  });
});
