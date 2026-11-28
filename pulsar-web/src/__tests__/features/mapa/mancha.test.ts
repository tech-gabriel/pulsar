import { describe, expect, it } from 'vitest';
import { pontosDaMancha } from '../../../features/mapa/mancha';
import type { Trecho } from '../../../features/cidade/trechos';
import type { FaixaRisco, SubprefeituraMapaDto } from '../../../types';

const centros: Record<string, [number, number]> = { a: [-46.6, -23.5], b: [-46.7, -23.6], c: [-46.8, -23.7] };

const area = (id: string, ventoKmH: number, chuvaMmH = 0, semLeitura = false) => ({
  id, nome: id, faixaRisco: 'BAIXO',
  scoreAtual: { valor: 0, faixa: 'BAIXO', timestamp: '', componentes: {
    alagamento: { valor: 0, faixa: 'BAIXO' },
    vento: { valor: 0, faixa: ventoKmH >= 50 ? 'ALTO' : 'BAIXO' },
    calor: { valor: 0, faixa: 'BAIXO' } } },
  ultimaLeitura: semLeitura ? null : { chuvaMmH, ventoKmH, sensacaoTermica: 25 },
}) as unknown as SubprefeituraMapaDto;

const trecho = (h3: string, faixa: FaixaRisco, mm1h?: number) => ({
  h3, areaId: 'x1', faixa, estacao: mm1h === undefined ? null : { mm1h },
}) as unknown as Trecho;

describe('pontosDaMancha', () => {
  it('risco: so atencao e alerta, nas coordenadas do centro', () => {
    const t = new Map([['a', trecho('a', 'BAIXO')], ['b', trecho('b', 'MODERADO')], ['c', trecho('c', 'ALTO')]]);
    const r = pontosDaMancha('score', centros, t, [], []);
    expect(r.features.map((f) => [f.properties.banda, f.geometry.coordinates])).toEqual([
      [1, [-46.7, -23.6]], [2, [-46.8, -23.7]],
    ]);
  });
  it('risco sem trechos fica vazio', () => {
    expect(pontosDaMancha('score', centros, null, [], []).features).toEqual([]);
  });
  it('vento: um ponto por trecho da area com dado, banda 2 a 50 km/h', () => {
    const areas = [area('x1', 50), area('x2', 0, 0, true)];
    const cel = [{ h3: 'a', areaId: 'x1' }, { h3: 'b', areaId: 'x1' }, { h3: 'c', areaId: 'x2' }];
    const r = pontosDaMancha('vento', centros, null, areas, cel);
    expect(r.features).toHaveLength(2);
    expect(r.features.every((f) => f.properties.banda === 2)).toBe(true);
  });
  it('ignora h3 sem centro, sem lancar', () => {
    const r = pontosDaMancha('vento', centros, null, [area('x1', 50)], [{ h3: 'zz', areaId: 'x1' }]);
    expect(r.features).toEqual([]);
  });
  it('chuva usa a estacao do trecho, senao a da area, e descarta 0 mm', () => {
    const t = new Map([['a', trecho('a', 'BAIXO', 3)], ['b', trecho('b', 'BAIXO')]]);
    const cel = [{ h3: 'a', areaId: 'x1' }, { h3: 'b', areaId: 'x1' }, { h3: 'c', areaId: 'x2' }];
    const r = pontosDaMancha('chuva', centros, t, [area('x1', 0, 1.5), area('x2', 0, 0)], cel);
    expect(r.features.map((f) => f.properties.mm)).toEqual([3, 1.5]);
  });
});
