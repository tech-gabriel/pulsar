import { describe, expect, it } from 'vitest';
import { campoDoVento, desvio, deveAnimar, pxPorQuadro } from '../../../features/mapa/ventoCampo';
import type { SubprefeituraMapaDto } from '../../../types';

const centros: Record<string, [number, number]> = { a: [-46.6, -23.5], b: [-46.7, -23.6], c: [-46.8, -23.7] };

const area = (id: string, ventoKmH: number, ventoDirecaoGraus: number | null | undefined) => ({
  id, ultimaLeitura: { ventoKmH, ventoDirecaoGraus },
}) as unknown as SubprefeituraMapaDto;

describe('campoDoVento', () => {
  it('um ponto por trecho, soprando para o lado oposto de onde vem', () => {
    const r = campoDoVento([area('x1', 61, 315)], [{ h3: 'a', areaId: 'x1' }, { h3: 'b', areaId: 'x1' }], centros);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ lon: -46.6, lat: -23.5, paraRad: expect.any(Number), kmh: 61 });
    expect(r[0].paraRad).toBeCloseTo((135 * Math.PI) / 180);
  });
  it('ignora area sem direcao, mas 0 grau (norte) vale', () => {
    const areas = [area('x1', 30, null), area('x2', 30, undefined), area('x3', 30, 0)];
    const cel = [{ h3: 'a', areaId: 'x1' }, { h3: 'b', areaId: 'x2' }, { h3: 'c', areaId: 'x3' }];
    const r = campoDoVento(areas, cel, centros);
    expect(r).toHaveLength(1);
    expect(r[0].paraRad).toBeCloseTo(Math.PI);
  });
  it('ignora calmaria, area sem leitura e h3 sem centro', () => {
    const semLeitura = { id: 'x2', ultimaLeitura: null } as unknown as SubprefeituraMapaDto;
    const cel = [{ h3: 'a', areaId: 'x1' }, { h3: 'b', areaId: 'x2' }, { h3: 'zz', areaId: 'x3' }];
    expect(campoDoVento([area('x1', 0, 90), semLeitura, area('x3', 20, 90)], cel, centros)).toEqual([]);
  });
});

describe('pxPorQuadro e desvio', () => {
  it('60 km/h anda uns 1,67 px por quadro', () => {
    expect(pxPorQuadro(60)).toBeCloseTo(1.67);
    expect(pxPorQuadro(0)).toBeCloseTo(0.35);
  });
  it('desvio e a curva suave do prototipo', () => {
    expect(desvio(0, 0)).toBeCloseTo(0.3);
    expect(desvio(-46.6, -23.5)).toBeCloseTo(0.42 * Math.sin(-46.6 * 62 - 23.5 * 18) + 0.3 * Math.cos(-23.5 * 75 + 46.6 * 21));
    expect(Math.abs(desvio(-46.6, -23.5))).toBeLessThanOrEqual(0.72);
  });
});

describe('deveAnimar', () => {
  const vento = { camada: 'vento', reduzido: false, visivel: true, temCampo: true } as const;
  it('so anima na camada vento, com aba visivel e campo', () => {
    expect(deveAnimar(vento)).toBe('animar');
    expect(deveAnimar({ ...vento, camada: 'score' })).toBe('nada');
    expect(deveAnimar({ ...vento, visivel: false })).toBe('nada');
    expect(deveAnimar({ ...vento, temCampo: false })).toBe('nada');
  });
  it('reduzir movimento deixa os tracinhos parados', () => {
    expect(deveAnimar({ ...vento, reduzido: true })).toBe('parado');
    expect(deveAnimar({ ...vento, reduzido: true, visivel: false })).toBe('nada');
  });
});
