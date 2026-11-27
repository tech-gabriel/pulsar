import { describe, expect, it } from 'vitest';
import { colocarEtiquetas, compacta, etiquetasDaCamada, type Etiqueta } from '../../../features/mapa/etiquetas';
import type { FaixaRisco, SubprefeituraMapaDto } from '../../../types';

function sub(id: string, faixa: FaixaRisco, valor: number): SubprefeituraMapaDto {
  return {
    id, nome: 'Mooca', latitude: -23.5, longitude: -46.6, zona: 'Leste', faixaRisco: faixa, temperaturaAtual: 25,
    scoreAtual: {
      valor, faixa, timestamp: '', perigoPrincipal: 'ALAGAMENTO',
      componentes: {
        alagamento: { valor: 0, faixa }, vento: { valor: 0, faixa: 'BAIXO' }, calor: { valor: 0, faixa: 'BAIXO' },
      },
    },
    ultimaLeitura: null,
  } as unknown as SubprefeituraMapaDto;
}

const et = (areaId: string, nivel: 'atencao' | 'alerta'): Etiqueta => ({
  areaId, nome: areaId, nivel, perigo: 'chuva', valor: '1', motivo: 'm', lon: 0, lat: 0,
});
const caixa = (x: number, y: number) => ({ x, y, w: 50, h: 20 });
const tela = { w: 400, h: 400 };

describe('etiquetasDaCamada', () => {
  it('so atencao e alerta, alerta primeiro, depois maior nota', () => {
    const r = etiquetasDaCamada([
      sub('a', 'MODERADO', 60), sub('b', 'ALTO', 70), sub('c', 'BAIXO', 5), sub('d', 'MODERADO', 65), sub('e', 'ALTO', 80),
    ], 'score');
    expect(r.map((e) => e.areaId)).toEqual(['e', 'b', 'd', 'a']);
    expect(r[0]).toMatchObject({ nivel: 'alerta', perigo: 'chuva', valor: '80', nome: 'Mooca' });
  });
});

describe('colocarEtiquetas', () => {
  it('sobrepostas: o alerta fica', () => {
    const { mostradas, ocultas } = colocarEtiquetas(
      [{ etiqueta: et('a', 'atencao'), caixa: caixa(100, 100) }, { etiqueta: et('b', 'alerta'), caixa: caixa(110, 105) }], [], tela);
    expect(mostradas.map((e) => e.areaId)).toEqual(['b']);
    expect(ocultas.map((e) => e.areaId)).toEqual(['a']);
  });
  it('bate em bloqueio: oculta', () => {
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(100, 100) }], [caixa(120, 110)], tela);
    expect(r.ocultas).toHaveLength(1);
  });
  it('fora da tela: oculta', () => {
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(380, 100) }], [], tela);
    expect(r.ocultas).toHaveLength(1);
  });
  it('folga conta: a 3 px colide, a 5 px nao', () => {
    const a = { etiqueta: et('a', 'alerta'), caixa: caixa(100, 100) };
    expect(colocarEtiquetas([a, { etiqueta: et('b', 'alerta'), caixa: caixa(153, 100) }], [], tela).ocultas).toHaveLength(1);
    expect(colocarEtiquetas([a, { etiqueta: et('b', 'alerta'), caixa: caixa(155, 100) }], [], tela).ocultas).toHaveLength(0);
  });
  it('tela de 320 px com 14 etiquetas: nenhuma some', () => {
    const itens = Array.from({ length: 14 }, (_, i) => ({ etiqueta: et(`e${i}`, 'atencao'), caixa: caixa(i * 20, 10) }));
    const r = colocarEtiquetas(itens, [], { w: 320, h: 600 });
    expect(r.mostradas.length + r.ocultas.length).toBe(14);
    expect(r.ocultas.length).toBeGreaterThan(0);
  });
});

describe('compacta', () => {
  it('abaixo de 11,5', () => {
    expect(compacta(11.4)).toBe(true);
    expect(compacta(11.5)).toBe(false);
  });
});
