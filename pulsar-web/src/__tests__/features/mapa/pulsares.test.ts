import { describe, expect, it } from 'vitest';
import { pulsaresGeojson } from '../../../features/mapa/pulsares';
import { corDoAnel } from '../../../features/mapa/nivel';
import { PALETA } from '../../../utils/paleta';
import type { FaixaRisco, SubprefeituraMapaDto } from '../../../types';

function sub(id: string, o: { faixa?: FaixaRisco; valor?: number; zona?: string; semScore?: boolean } = {}): SubprefeituraMapaDto {
  const f = o.faixa ?? 'BAIXO';
  const c = { valor: 0, faixa: f };
  return {
    id, nome: `Area ${id}`, latitude: -23.5, longitude: -46.6, zona: o.zona ?? 'Leste', faixaRisco: f, temperaturaAtual: 25,
    scoreAtual: o.semScore ? null : { valor: o.valor ?? 10, faixa: f, timestamp: '', perigoPrincipal: 'ALAGAMENTO', componentes: { alagamento: c, vento: c, calor: c } },
    ultimaLeitura: { chuvaMmH: 0, ventoKmH: 0, visibilidadeKm: 10, indiceUv: 1, temperaturaC: 25, sensacaoTermica: 25, umidade: 50, timestamp: '' },
  } as SubprefeituraMapaDto;
}

const op = (o: Partial<Parameters<typeof pulsaresGeojson>[2]> = {}) =>
  ({ favoritas: new Set<string>(), comEtiqueta: new Set<string>(), ocultos: new Set<string>(), zonaEmFoco: null, ...o });
const props = (areas: SubprefeituraMapaDto[], o = op(), camada: 'score' = 'score') =>
  pulsaresGeojson(areas, camada, o).features.map((f) => f.properties);

describe('pulsaresGeojson', () => {
  it('area com etiqueta mostrada fica de fora', () => {
    expect(props([sub('a', { faixa: 'ALTO' })], op({ comEtiqueta: new Set(['a']) }))).toEqual([]);
  });
  it('area em risco sem etiqueta entra com risco e nota', () => {
    const [p] = props([sub('a', { faixa: 'ALTO', valor: 80 })]);
    expect(p).toMatchObject({ id: 'a', risco: true, nota: '80', cor: '#D62C2C', notaEscura: false });
  });
  it('sem dado e neutro e sem nota', () => {
    expect(props([sub('a', { semScore: true })])[0]).toMatchObject({ cor: PALETA.neutro, nota: '', risco: false });
  });
  it('favorita amarela tem anel escurecido e nota escura', () => {
    const [p] = props([sub('a', { faixa: 'MODERADO' })], op({ favoritas: new Set(['a']), comEtiqueta: new Set(['a']) }));
    expect(p).toBeUndefined();
    const [q] = props([sub('a', { faixa: 'MODERADO' })], op({ favoritas: new Set(['a']) }));
    expect(q).toMatchObject({ fav: true, anel: corDoAnel('#F2C200'), notaEscura: true });
  });
  it('zona em foco esmaece as outras', () => {
    const r = props([sub('a', { zona: 'Sul' }), sub('b', { zona: 'Leste' })], op({ zonaEmFoco: 'Leste' }));
    expect(r.map((p) => p.esmaecida)).toEqual([true, false]);
  });
  it('area oculta (rota) entra sem nota', () => {
    expect(props([sub('a', { faixa: 'ALTO' })], op({ ocultos: new Set(['a']) }))[0]).toMatchObject({ nota: '' });
  });
});
