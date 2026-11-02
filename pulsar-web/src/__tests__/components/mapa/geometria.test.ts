import { describe, it, expect } from 'vitest';
import { circuloGeojson, deslocamentoDoPainel, paddingDoPainel } from '../../../components/mapa/geometria';

describe('geometria do mapa', () => {
  it('círculo fechado com raio em metros reais', () => {
    const anel = circuloGeojson(-23.55, -46.63, 1000).geometry.coordinates[0];
    expect(anel).toHaveLength(65);
    expect(anel[0]).toEqual(anel[64]);
    const norte = Math.max(...anel.map(([, lat]) => lat));
    expect(norte - -23.55).toBeCloseTo(1000 / 111320, 4);
  });

  it('raio grande (5 km) continua fechado e simétrico', () => {
    const anel = circuloGeojson(-23.55, -46.63, 5000).geometry.coordinates[0];
    const lons = anel.map(([lon]) => lon);
    expect(Math.max(...lons) + Math.min(...lons)).toBeCloseTo(2 * -46.63, 4);
    expect(anel[0]).toEqual(anel[anel.length - 1]);
  });

  it('deslocamentoDoPainel põe o alvo no centro da parte visível (metade do que o painel cobre)', () => {
    expect(deslocamentoDoPainel({ top: 0, right: 400, bottom: 0, left: 0 })).toEqual([-200, -0]);
    expect(deslocamentoDoPainel({ top: 0, right: 0, bottom: 300, left: 0 })).toEqual([-0, -150]);
    expect(deslocamentoDoPainel({ top: 0, right: 0, bottom: 0, left: 0 })).toEqual([-0, -0]);
  });

  it('paddingDoPainel sem painel visível devolve zeros', () => {
    const div = document.createElement('div');
    expect(paddingDoPainel(div)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
});
