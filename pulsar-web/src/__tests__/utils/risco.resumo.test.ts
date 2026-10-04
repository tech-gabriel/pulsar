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
    expect(resumoAlertas([r('BAIXO'), r('MODERADO')], false)).toBe('Tudo tranquilo em São Paulo');
  });
  it('conta os alertas ativos', () => {
    expect(resumoAlertas([r('ALTO')], false)).toBe('1 alerta ativo');
    expect(resumoAlertas([r('ALTO'), r('ALTO'), r('BAIXO')], true)).toBe('2 alertas ativos');
  });
  it('usa o nome da cidade recebido', () => {
    expect(resumoAlertas([{ faixaRisco: 'BAIXO' }], false, 'Recife')).toBe('Tudo tranquilo em Recife');
  });
});
