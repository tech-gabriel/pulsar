import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { resolverSelecao } from '../../utils/selecaoPorPonto';

// GeoJSON mínimo: um quadrado cobrindo (lon -1..1, lat -1..1) = subprefeitura "Centro".
const geojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { nm_subprefeitura: 'Centro', nm_regiao_05: 'Centro' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
      },
    },
  ],
};

const subs = [{ nome: 'Centro', regiaoNome: 'Região Central', id: 'r1' }];

describe('resolverSelecao', () => {
  it('casa a subprefeitura quando o ponto está dentro e existe no backend', () => {
    const sel = resolverSelecao(0, 0, geojson, subs, 'busca');
    expect(sel.sub).toEqual(subs[0]);
    expect(sel.regiaoNome).toBe('Região Central');
    expect(sel.aviso).toBeNull();
  });

  it('usa a região do GeoJSON quando a subprefeitura não está no backend', () => {
    const sel = resolverSelecao(0, 0, geojson, [], 'busca');
    expect(sel.sub).toBeNull();
    expect(sel.regiaoNome).toBe('Centro');
    expect(sel.aviso).toBeNull();
  });

  it('devolve aviso de busca quando o ponto está fora dos polígonos', () => {
    const sel = resolverSelecao(50, 50, geojson, subs, 'busca');
    expect(sel.sub).toBeNull();
    expect(sel.regiaoNome).toBeNull();
    expect(sel.aviso).toMatch(/endereço está fora/i);
  });

  it('devolve aviso de localização (texto próprio) quando fora dos polígonos', () => {
    const sel = resolverSelecao(50, 50, geojson, subs, 'localizacao');
    expect(sel.aviso).toMatch(/fora de São Paulo capital/i);
  });
});
