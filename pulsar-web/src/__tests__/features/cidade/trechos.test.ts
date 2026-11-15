import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import type { CelulaAgoraDto, CelulasAgoraDto } from '../../../types';
import type { Area } from '../../../features/cidade/areas';
import { fraseDaEstacao, fraseDoTrecho, h3DoPonto, montarTrechos, trechosDe } from '../../../features/cidade/trechos';

const componente = (valor: number, faixa: 'BAIXO' | 'MODERADO' | 'ALTO') => ({ valor, faixa });

const area = (o: { vento?: number; calor?: number; semComponentes?: boolean } = {}) => ({
  id: 'a1', nome: 'Itaquera', zona: 'Leste', faixaRisco: 'MODERADO',
  scoreAtual: {
    valor: 40, faixa: 'MODERADO', timestamp: '', perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 20,
    componentes: o.semComponentes ? undefined : {
      alagamento: componente(40, 'MODERADO'),
      vento: componente(o.vento ?? 5, 'BAIXO'),
      calor: componente(o.calor ?? 10, o.calor && o.calor >= 31 ? 'MODERADO' : 'BAIXO'),
    },
  },
}) as unknown as Area;

const celula = (o: Partial<CelulaAgoraDto> = {}): CelulaAgoraDto =>
  ({ h3: 'h1', areaId: 'a1', valor: 70, faixa: 'ALTO', estacao: null, distanciaKm: null, ...o });

const agora = (celulas: CelulaAgoraDto[], estacoes = [{ cod: 'E1', mm1h: 4.2, mm3h: 6 }]): CelulasAgoraDto =>
  ({ calculadoEm: '', estacoes, celulas });

describe('trechosDe', () => {
  it('o alagamento do trecho manda quando é o maior perigo', () => {
    const t = trechosDe(agora([celula()]), [area()]).get('h1')!;
    expect(t).toMatchObject({ valor: 70, faixa: 'ALTO', perigo: 'ALAGAMENTO', areaId: 'a1' });
    expect(t.alagamento).toEqual({ valor: 70, faixa: 'ALTO' });
  });

  // Vento e calor valem para a área inteira: um trecho seco não fica mais calmo que a área.
  it('calor da área acima do alagamento do trecho: o trecho mostra o calor', () => {
    const t = trechosDe(agora([celula({ valor: 5, faixa: 'BAIXO' })]), [area({ calor: 45 })]).get('h1')!;
    expect(t).toMatchObject({ valor: 45, faixa: 'MODERADO', perigo: 'CALOR' });
    expect(t.alagamento).toEqual({ valor: 5, faixa: 'BAIXO' });
  });

  it('empate fica com o alagamento, como no score da área', () => {
    const t = trechosDe(agora([celula({ valor: 30, faixa: 'BAIXO' })]), [area({ vento: 30 })]).get('h1')!;
    expect(t.perigo).toBe('ALAGAMENTO');
  });

  it('sem componentes na área, só o alagamento do trecho', () => {
    const t = trechosDe(agora([celula({ valor: 12, faixa: 'BAIXO' })]), [area({ semComponentes: true })]).get('h1')!;
    expect(t).toMatchObject({ valor: 12, perigo: 'ALAGAMENTO' });
  });

  it('a estação do trecho vem com a leitura e a distância', () => {
    const t = trechosDe(agora([celula({ estacao: 0, distanciaKm: 1.9 })]), [area()]).get('h1')!;
    expect(t.estacao).toEqual({ cod: 'E1', mm1h: 4.2, mm3h: 6, distanciaKm: 1.9 });
  });

  it('célula de área que o app não conhece fica de fora', () => {
    expect(trechosDe(agora([celula({ areaId: 'outra' })]), [area()]).size).toBe(0);
  });
});

describe('fraseDaEstacao', () => {
  const est = (mm1h: number, mm3h: number, distanciaKm = 1.9) => ({ cod: 'E1', mm1h, mm3h, distanciaKm });

  it('chuva na última hora', () => {
    expect(fraseDaEstacao(est(4.2, 6))).toBe('Estação a 1,9 km mediu 4,2 mm na última hora');
  });
  it('sem chuva na última hora, mas nas 3 horas', () => {
    expect(fraseDaEstacao(est(0, 6))).toBe('Estação a 1,9 km mediu 6,0 mm nas últimas 3 horas');
  });
  it('estação seca', () => {
    expect(fraseDaEstacao(est(0, 0))).toBe('Estação a 1,9 km sem chuva nas últimas 3 horas');
  });
  it('estação dentro do trecho não ganha "a 0,0 km"', () => {
    expect(fraseDaEstacao(est(2, 2, 0.04))).toBe('Estação neste trecho mediu 2,0 mm na última hora');
  });
});

// Dois quadrados lado a lado no lugar dos hexágonos: a conta de ponto no polígono é a mesma.
const contorno: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { h3: 'h1' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
    { type: 'Feature', properties: { h3: 'h2' }, geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
  ],
};

describe('h3DoPonto', () => {
  it('acha o trecho que contém o ponto', () => {
    expect(h3DoPonto(0.5, 1.5, contorno)).toBe('h2');
  });
  it('fora da grade devolve null', () => {
    expect(h3DoPonto(5, 5, contorno)).toBeNull();
  });
});

describe('montarTrechos', () => {
  it('só desenha trecho com risco, com a cor e a opacidade da faixa', () => {
    const t = trechosDe(agora([celula()]), [area()]);
    const fc = montarTrechos(contorno, t);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toMatchObject({ h3: 'h1', faixa: 'ALTO' });
    expect(fc.features[0].properties.cor).toMatch(/^#/);
    expect(fc.features[0].properties.opacidade).toBeGreaterThan(0);
  });
});

describe('fraseDoTrecho', () => {
  it('alagamento com estação: a leitura da estação', () => {
    const t = trechosDe(agora([celula({ estacao: 0, distanciaKm: 1.9 })]), [area()]).get('h1')!;
    expect(fraseDoTrecho(t, area(), [])).toBe('Estação a 1,9 km mediu 4,2 mm na última hora');
  });

  // A área está em Atenção pela chuva do modelo; o trecho, com fator maior, em Alerta.
  it('sem estação: o porquê com a faixa do trecho', () => {
    const t = trechosDe(agora([celula()]), [area()]).get('h1')!;
    expect(fraseDoTrecho(t, area(), [])).toBe('Por chuva: 20,0 mm nas últimas 3h');
  });

  it('calor da área mandando no trecho: fala do calor mesmo com estação perto', () => {
    const a = { ...area({ calor: 45 }), ultimaLeitura: { sensacaoTermica: 38 } } as unknown as Area;
    const t = trechosDe(agora([celula({ valor: 5, faixa: 'BAIXO', estacao: 0, distanciaKm: 1 })]), [a]).get('h1')!;
    expect(fraseDoTrecho(t, a, [])).toBe('Por calor: sensação de 38 °C');
  });

  // Visto no navegador: área em Alerta pelo modelo, trecho tranquilo porque a estação ao lado
  // marcou zero. A frase precisa dizer o porquê, não falar da previsão.
  it('trecho tranquilo com estação: a leitura dela, mesmo com o calor na frente', () => {
    const t = trechosDe(agora([celula({ valor: 0, faixa: 'BAIXO', estacao: 0, distanciaKm: 2.3 })], [{ cod: 'E1', mm1h: 0, mm3h: 0 }]), [area()]).get('h1')!;
    expect(t.perigo).toBe('CALOR'); // calor 10 > alagamento 0: a premissa do teste
    expect(fraseDoTrecho(t, area(), [])).toBe('Estação a 2,3 km sem chuva nas últimas 3 horas');
  });

  // A área pode ter o número pela medida (estações do outro lado dela); o trecho sem estação
  // usou o modelo, e é o modelo que a frase dele cita.
  it('trecho sem estação cita o modelo, mesmo com a área pela chuva medida', () => {
    const a = area();
    const comMedida = { ...a, scoreAtual: { ...a.scoreAtual!, chuva3hMedidaMm: 38 } } as Area;
    const t = trechosDe(agora([celula()]), [comMedida]).get('h1')!;
    expect(fraseDoTrecho(t, comMedida, [])).toBe('Por chuva: 20,0 mm nas últimas 3h');
  });

  it('trecho tranquilo sem estação e sem previsão: nada fora do normal', () => {
    const t = trechosDe(agora([celula({ valor: 3, faixa: 'BAIXO' })]), [area()]).get('h1')!;
    expect(fraseDoTrecho(t, area(), [])).toBe('Nada fora do normal agora');
  });
});
