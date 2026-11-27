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
  it('sobrepostas: o alerta fica no ponto e a outra cede para um lado', () => {
    const r = colocarEtiquetas(
      [{ etiqueta: et('a', 'atencao'), caixa: caixa(100, 100) }, { etiqueta: et('b', 'alerta'), caixa: caixa(110, 105) }], [], tela);
    expect(r.mostradas.map((e) => e.areaId)).toEqual(['b', 'a']);
    expect(r.desvios.b).toEqual({ x: 0, y: 0 });
    expect(r.desvios.a).not.toEqual({ x: 0, y: 0 });
  });
  it('bate no pino da Casa: a etiqueta sai de cima dele, o pino fica (regra de 17/11)', () => {
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(100, 100) }], [caixa(120, 110)], tela);
    expect(r.ocultas).toHaveLength(0);
    expect(r.desvios.a).toEqual({ x: 0, y: -36 }); // acima: meia altura (10) + 26 (raio do pino + folga)
  });
  it('sem lado livre: oculta (vira pulsar com a nota)', () => {
    // Tela do tamanho da caixa: qualquer lado sai da tela, e o centro bate no bloqueio.
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(0, 0) }], [caixa(10, 5)], { w: 50, h: 20 });
    expect(r.ocultas.map((e) => e.areaId)).toEqual(['a']);
    expect(r.desvios.a).toBeUndefined();
  });
  it('fora da tela no ponto: tenta o lado que cabe', () => {
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(380, 100) }], [], tela);
    expect(r.ocultas).toHaveLength(0);
    expect(r.desvios.a).toEqual({ x: -51, y: 0 }); // à esquerda: meia largura (25) + 26
  });
  it('folga conta: a 3 px colide e cede, a 5 px fica no ponto', () => {
    const a = { etiqueta: et('a', 'alerta'), caixa: caixa(100, 100) };
    expect(colocarEtiquetas([a, { etiqueta: et('b', 'alerta'), caixa: caixa(153, 100) }], [], tela).desvios.b).not.toEqual({ x: 0, y: 0 });
    expect(colocarEtiquetas([a, { etiqueta: et('b', 'alerta'), caixa: caixa(155, 100) }], [], tela).desvios.b).toEqual({ x: 0, y: 0 });
  });
  it('coberta pela interface (busca, cartão, botões): tenta outro lado', () => {
    // A parte de cima da tela (y < 80) está sob a interface; a etiqueta não fica ali.
    const coberta = (c: { y: number }) => c.y < 80;
    const r = colocarEtiquetas([{ etiqueta: et('a', 'alerta'), caixa: caixa(100, 70) }], [], tela, 4, coberta);
    expect(r.desvios.a).toEqual({ x: 0, y: 36 }); // acima também está coberto: vai para baixo
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
