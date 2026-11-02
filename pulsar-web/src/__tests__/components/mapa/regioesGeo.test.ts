import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { montarRegioes } from '../../../components/mapa/regioesGeo';
import { estiloCamada } from '../../../utils/camadas';
import type { FaixaRisco, SubprefeituraMapaDto } from '../../../types';

function sub(over: Partial<SubprefeituraMapaDto>): SubprefeituraMapaDto {
  return {
    id: 's1', nome: 'Pinheiros', latitude: -23.56, longitude: -46.69,
    scoreAtual: { valor: 42, faixa: 'MODERADO', timestamp: '2026-06-06T12:00:00Z' },
    faixaRisco: 'MODERADO' as FaixaRisco, temperaturaAtual: 20, ultimaLeitura: null, zona: 'Oeste',
    ...over,
  } as SubprefeituraMapaDto;
}

const subs = [sub({ id: 'pin', nome: 'Pinheiros', zona: 'Oeste' }), sub({ id: 'se', nome: 'Sé', zona: 'Centro' })];
const quadrado = { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
const geo: FeatureCollection = {
  type: 'FeatureCollection',
  features: ['PINHEIROS', 'SÉ', 'NAO EXISTE'].map((nm) => ({ type: 'Feature', properties: { nm_subprefeitura: nm }, geometry: quadrado })),
};

describe('montarRegioes', () => {
  it('sem par fica cinza neutro e sem subId', () => {
    const p = montarRegioes(geo, subs, 'score', null, null).features[2].properties;
    expect(p).toMatchObject({ subId: null, fill: '#94a3b8', borda: '#94a3b8', fillOpacity: 0.12, bordaOpacidade: 0.3, peso: 1, estado: 'normal' });
  });

  it('normal usa o estilo da camada com borda a 0,6', () => {
    const e = estiloCamada(subs[0], 'score');
    const p = montarRegioes(geo, subs, 'score', null, null).features[0].properties;
    expect(p).toMatchObject({ subId: 'pin', fill: e.fillColor, fillOpacity: e.fillOpacity, borda: e.borderColor, bordaOpacidade: 0.6, peso: e.weight, estado: 'normal' });
  });

  it('selecionada ganha borda branca e +0,1', () => {
    const p = montarRegioes(geo, subs, 'score', 'pin', null).features[0].properties;
    expect(p).toMatchObject({ estado: 'selecionada', borda: '#ffffff', bordaOpacidade: 1, peso: 2 });
    expect(p.fillOpacity).toBeCloseTo(estiloCamada(subs[0], 'score').fillOpacity + 0.1);
  });

  it('com zona: fora esmaece e dentro destaca', () => {
    const [pin, se] = montarRegioes(geo, subs, 'score', null, 'oeste').features.map((f) => f.properties);
    expect(se).toMatchObject({ estado: 'fora', fillOpacity: 0.05, bordaOpacidade: 0.15, peso: 1 });
    expect(pin).toMatchObject({ estado: 'foco', borda: '#ffffff', bordaOpacidade: 0.9, peso: 2 });
    expect(pin.fillOpacity).toBeCloseTo(estiloCamada(subs[0], 'score').fillOpacity + 0.05);
  });

  it('selecionada dentro da zona continua selecionada', () => {
    expect(montarRegioes(geo, subs, 'score', 'pin', 'Oeste').features[0].properties.estado).toBe('selecionada');
  });

  it('ids numéricos estáveis por índice', () => {
    expect(montarRegioes(geo, subs, 'score', null, null).features.map((f) => f.id)).toEqual([0, 1, 2]);
  });

  it('acentos e caixa não impedem o par', () => {
    expect(montarRegioes(geo, subs, 'score', null, null).features[1].properties.subId).toBe('se');
  });
});
