import { describe, it, expect } from 'vitest';
import { tooltipSubprefeituraHtml } from '../../../components/mapa/tooltipSub';
import type { SubprefeituraMapaDto } from '../../../types';

const sub: SubprefeituraMapaDto = {
  id: 's1',
  nome: 'Sé',
  latitude: -23.5,
  longitude: -46.6,
  scoreAtual: { valor: 42.7, faixa: 'MODERADO', timestamp: '2026-06-06T12:00:00Z' },
  faixaRisco: 'MODERADO',
  temperaturaAtual: 24.3,
  ultimaLeitura: {
    chuvaMmH: 2.5,
    ventoKmH: 18.4,
    visibilidadeKm: 8.2,
    indiceUv: 6,
    temperaturaC: 24.3,
    sensacaoTermica: 25,
    umidade: 60,
    timestamp: '2026-06-06T12:00:00Z',
  },
  regiaoId: 'r1',
  regiaoNome: 'Centro',
};

describe('tooltipSubprefeituraHtml', () => {
  it('inclui nome, região, score arredondado e variáveis climáticas', () => {
    const html = tooltipSubprefeituraHtml(sub, 'Fallback');
    expect(html).toContain('Sé');
    expect(html).toContain('Região Centro');
    expect(html).toContain('43'); // score 42.7 arredondado
    expect(html).toContain('24.3°C');
    expect(html).toContain('2.5 mm/h');
    expect(html).toContain('18 km/h'); // vento arredondado
    expect(html).toContain('8.2 km');
  });

  it('usa o nome de fallback e mensagem vazia quando não há subprefeitura', () => {
    const html = tooltipSubprefeituraHtml(undefined, 'Vila Mariana');
    expect(html).toContain('Vila Mariana');
    expect(html).toContain('Ainda sem dados');
  });

  it('mostra traço para variáveis quando não há leitura', () => {
    const html = tooltipSubprefeituraHtml({ ...sub, ultimaLeitura: null, scoreAtual: null }, 'X');
    expect(html).toContain('—');
  });
});
