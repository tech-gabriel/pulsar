import { describe, it, expect } from 'vitest';
import { resumoAlertas } from '../../utils/risco';

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
