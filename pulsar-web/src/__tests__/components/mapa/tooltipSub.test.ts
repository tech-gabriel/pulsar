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
  zona: 'Centro',
};

describe('tooltipSubprefeituraHtml', () => {
  it('prévia: nome, score arredondado na cor da faixa e chuva, calor e vento, uma por linha', () => {
    const html = tooltipSubprefeituraHtml(sub, 'Fallback');
    expect(html).toContain('Sé');
    // Sem a linha "faixa · zona" (16/11/2026): o número na cor da faixa diz o risco.
    expect(html).not.toContain('Zona Centro');
    expect(html).toContain('class="pt-score pt-MODERADO"');
    expect(html).toContain('>43<'); // score 42.7 arredondado
    expect(html.match(/class="pt-dado"/g)).toHaveLength(3);
    expect(html).toContain('24,3 °C');
    expect(html).toContain('2,5 mm/h');
    expect(html).toContain('18 km/h'); // vento arredondado
    // Umidade, UV e visibilidade ficam no detalhe: o tooltip é prévia.
    expect(html).not.toContain('8,2 km');
    expect(html).not.toContain('60%');
  });

  it('mostra os alagamentos ativos do CGE em vermelho, e nada sem eles', () => {
    const ponto = { via: 'Av Celso Garcia', referencia: '', inicioUtc: '2026-10-25T04:06:00Z', transitavel: false };
    expect(tooltipSubprefeituraHtml({ ...sub, alagamentosCge: [ponto, ponto] }, 'X'))
      .toContain('<div class="pt-cge pt-ALTO">2 pontos de alagamento agora, segundo o CGE</div>');
    expect(tooltipSubprefeituraHtml({ ...sub, alagamentosCge: [ponto] }, 'X')).toContain('Alagamento agora, segundo o CGE');
    expect(tooltipSubprefeituraHtml(sub, 'X')).not.toContain('pt-cge');
  });

  it('usa o nome de fallback e mensagem vazia quando não há subprefeitura', () => {
    const html = tooltipSubprefeituraHtml(undefined, 'Vila Mariana');
    expect(html).toContain('Vila Mariana');
    expect(html).toContain('Ainda sem dados');
  });

  it('escapa HTML no nome', () => {
    const html = tooltipSubprefeituraHtml({ ...sub, nome: '<img src=x onerror=alert(1)>' }, 'X');
    expect(html).not.toContain('<img');
    expect(html).toContain('&#60;img');
  });

  it('avisa quando não há leitura, sem score inventado', () => {
    const html = tooltipSubprefeituraHtml({ ...sub, ultimaLeitura: null, scoreAtual: null }, 'X');
    expect(html).toContain('Sem leitura recente');
    expect(html).not.toMatch(/class="pt-score /);
  });

  const medida = { fonte: 'cge' as const, mm15: 2.4, mm60: 5.8, acumuladoPeriodoMm: 9, posto: 'Sé', vizinho: false, coletadoEm: '2026-11-11T03:45:00Z' };
  it('com leitura do CGE, a chuva da prévia é a medida, dita como medida', () => {
    const html = tooltipSubprefeituraHtml({ ...sub, chuvaMedida: medida }, 'X');
    expect(html).toContain('2,4 mm em 15 min');
    expect(html).toContain('>medida<');
    expect(html).not.toContain('mm/h');
  });
  it('sem leitura do CGE, ou sem a janela de 15 minutos, segue a chuva do modelo', () => {
    expect(tooltipSubprefeituraHtml({ ...sub, chuvaMedida: null }, 'X')).toContain('2,5 mm/h');
    const html = tooltipSubprefeituraHtml({ ...sub, chuvaMedida: { ...medida, mm15: null } }, 'X');
    expect(html).toContain('2,5 mm/h');
    expect(html).not.toContain('>medida<');
  });
});
