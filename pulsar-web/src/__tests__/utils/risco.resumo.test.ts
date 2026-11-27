import { describe, it, expect } from 'vitest';
import { resumoAlertas } from '../../utils/risco';
import { resumoDoMapa } from '../../features/mapa/nivel';
import type { SubprefeituraMapaDto } from '../../types';

const r = (faixaRisco: 'BAIXO' | 'MODERADO' | 'ALTO') => ({ faixaRisco });

describe('resumoAlertas', () => {
  it('sem dado nunca diz "tranquilo": carregando', () => {
    expect(resumoAlertas([], true)).toBe('Carregando o risco…');
  });
  it('sem dado nunca diz "tranquilo": falhou', () => {
    expect(resumoAlertas([], false)).toBe('Sem dados de risco agora');
  });
  it('com dado e sem ALTO, tranquilo', () => {
    expect(resumoAlertas([r('BAIXO'), r('MODERADO')], false)).toBe('1 em atenção');
    expect(resumoAlertas([r('BAIXO')], false)).toBe('Tudo tranquilo em São Paulo');
    expect(resumoAlertas([r('ALTO'), r('MODERADO'), r('MODERADO')], false)).toBe('1 em alerta, 2 em atenção');
  });
  it('conta os alertas ativos', () => {
    expect(resumoAlertas([r('ALTO')], false)).toBe('1 em alerta');
    expect(resumoAlertas([r('ALTO'), r('ALTO'), r('BAIXO')], true)).toBe('2 em alerta');
  });
  it('usa o nome da cidade recebido', () => {
    expect(resumoAlertas([{ faixaRisco: 'BAIXO' }], false, 'Recife')).toBe('Tudo tranquilo em Recife');
  });
});

describe('resumoDoMapa', () => {
  const area = (faixaRisco: 'BAIXO' | 'MODERADO' | 'ALTO', ventoKmH = 10, ventoDirecaoGraus: number | null = null) =>
    ({ faixaRisco, ultimaLeitura: { ventoKmH, ventoDirecaoGraus } }) as unknown as SubprefeituraMapaDto;

  it('no risco, conta os alertas e diz quando a casa esta em risco', () => {
    const areas = [area('ALTO'), area('BAIXO')];
    expect(resumoDoMapa({ camada: 'score', areas, carregando: false, casa: { nivel: 'atencao' } })).toBe('1 em alerta. Sua casa está em Atenção');
    expect(resumoDoMapa({ camada: 'score', areas, carregando: false, casa: { nivel: 'tranquilo' } })).toBe('1 em alerta');
    expect(resumoDoMapa({ camada: 'score', areas, carregando: false })).toBe('1 em alerta');
  });
  it('no vento, o mais forte e de onde ele vem', () => {
    const areas = [area('BAIXO', 61, 315), area('BAIXO', 30, 90)];
    expect(resumoDoMapa({ camada: 'vento', areas, carregando: false })).toBe('Vento de noroeste, até 61 km/h');
    expect(resumoDoMapa({ camada: 'vento', areas: [area('BAIXO', 61)], carregando: false })).toBe('Vento de até 61 km/h');
  });
  it('sem dado nunca diz tranquilo, em nenhuma camada', () => {
    expect(resumoDoMapa({ camada: 'score', areas: [], carregando: false })).toBe('Sem dados de risco agora');
    expect(resumoDoMapa({ camada: 'vento', areas: [], carregando: true })).toBe('Carregando o risco…');
  });
});
