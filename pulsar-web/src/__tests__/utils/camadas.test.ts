import { describe, it, expect } from 'vitest';
import { estiloCamada, metricasSubprefeitura } from '../../utils/camadas';
import type { FaixaRisco, LeituraDto, SubprefeituraMapaDto } from '../../types';

function leitura(over: Partial<LeituraDto> = {}): LeituraDto {
  return {
    chuvaMmH: 0,
    ventoKmH: 0,
    visibilidadeKm: 10,
    indiceUv: 0,
    temperaturaC: 20,
    sensacaoTermica: 20,
    umidade: 50,
    timestamp: '2026-06-06T12:00:00Z',
    ...over,
  };
}

function sub(over: Partial<SubprefeituraMapaDto> = {}): SubprefeituraMapaDto {
  return {
    id: 's1',
    nome: 'Sé',
    latitude: -23.5,
    longitude: -46.6,
    scoreAtual: { valor: 42, faixa: 'MODERADO', timestamp: '2026-06-06T12:00:00Z' },
    faixaRisco: 'MODERADO' as FaixaRisco,
    temperaturaAtual: 20,
    ultimaLeitura: leitura(),
    regiaoId: 'r1',
    regiaoNome: 'Centro',
    ...over,
  };
}

describe('estiloCamada — sem dados', () => {
  it('camada score sem score retorna traço e cinza', () => {
    const e = estiloCamada(sub({ scoreAtual: null }), 'score');
    expect(e.texto).toBe('—');
    expect(e.fillColor).toBe('#94a3b8');
    expect(e.pulsa).toBe(false);
  });

  it('camadas de leitura sem ultimaLeitura retornam traço', () => {
    const s = sub({ ultimaLeitura: null });
    for (const camada of ['temperatura', 'chuva', 'vento', 'uv'] as const) {
      expect(estiloCamada(s, camada).texto).toBe('—');
    }
  });
});

describe('estiloCamada — score', () => {
  it('arredonda o valor e marca pulsa quando score > 60', () => {
    const e = estiloCamada(sub({ scoreAtual: { valor: 72.6, faixa: 'ALTO', timestamp: '' }, faixaRisco: 'ALTO' }), 'score');
    expect(e.texto).toBe('73');
    expect(e.pulsa).toBe(true);
  });

  it('não pulsa quando score <= 60', () => {
    const e = estiloCamada(sub({ scoreAtual: { valor: 60, faixa: 'MODERADO', timestamp: '' } }), 'score');
    expect(e.pulsa).toBe(false);
  });
});

describe('estiloCamada — temperatura', () => {
  it.each([
    [8, '#3b82f6'],   // <=10 azul
    [15, '#22c55e'],  // <=20 verde
    [25, '#f59e0b'],  // <=30 laranja
    [35, '#ef4444'],  // >30 vermelho
  ])('temperatura %d°C usa cor %s', (t, cor) => {
    const e = estiloCamada(sub({ ultimaLeitura: leitura({ temperaturaC: t }) }), 'temperatura');
    expect(e.texto).toBe(`${Math.round(t)}°`);
    expect(e.fillColor).toBe(cor);
  });
});

describe('estiloCamada — chuva/vento/uv', () => {
  it('chuva forte (>25) usa azul intenso', () => {
    const e = estiloCamada(sub({ ultimaLeitura: leitura({ chuvaMmH: 30 }) }), 'chuva');
    expect(e.texto).toBe('30.0');
    expect(e.fillColor).toBe('#1d4ed8');
  });

  it('vento forte (>60) usa vermelho', () => {
    const e = estiloCamada(sub({ ultimaLeitura: leitura({ ventoKmH: 70 }) }), 'vento');
    expect(e.texto).toBe('70');
    expect(e.fillColor).toBe('#ef4444');
  });

  it('uv extremo (>10) usa roxo', () => {
    const e = estiloCamada(sub({ ultimaLeitura: leitura({ indiceUv: 12 }) }), 'uv');
    expect(e.texto).toBe('12');
    expect(e.fillColor).toBe('#9333ea');
  });
});

describe('metricasSubprefeitura', () => {
  it('retorna as 5 métricas na ordem score → uv', () => {
    const m = metricasSubprefeitura(sub({
      scoreAtual: { valor: 42, faixa: 'MODERADO', timestamp: '' },
      ultimaLeitura: leitura({ temperaturaC: 21.4, chuvaMmH: 2.5, ventoKmH: 18.7, indiceUv: 6 }),
    }));
    expect(m.map((x) => x.camada)).toEqual(['score', 'temperatura', 'chuva', 'vento', 'uv']);
    expect(m[0].valor).toContain('Moderado');
    expect(m[1].valor).toBe('21.4°C');
    expect(m[2].valor).toBe('2.5 mm/h');
    expect(m[3].valor).toBe('19 km/h');
    expect(m[4].valor).toBe('6');
  });

  it('usa traço quando não há leitura', () => {
    const m = metricasSubprefeitura(sub({ ultimaLeitura: null, scoreAtual: null }));
    expect(m[1].valor).toBe('—°C');
    expect(m[2].valor).toBe('— mm/h');
    expect(m[3].valor).toBe('— km/h');
    expect(m[4].valor).toBe('—');
  });
});
