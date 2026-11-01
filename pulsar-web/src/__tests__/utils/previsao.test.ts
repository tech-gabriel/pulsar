import { describe, it, expect } from 'vitest';
import { fraseChuvaForte, quando } from '../../utils/previsao';
import type { FaixaPrevisaoDto } from '../../types';

// Datas montadas no fuso local, para o teste valer em qualquer máquina.
const local = (dia: number, hora: number) => new Date(2026, 10, dia, hora).getTime();
const faixa = (ms: number, chuvaMm: number, probabilidadeChuva = 0.8) => ({
  instantePrevisto: new Date(ms).toISOString(), chuvaMm, probabilidadeChuva,
  ventoKmH: 10, rajadaKmH: null, temperaturaC: 22, condicaoCodigo: 500, condicaoDescricao: 'chuva', coletadoEm: '',
}) as FaixaPrevisaoDto;

describe('previsao', () => {
  const agora = local(1, 14);

  it('diz hoje, amanhã ou o dia da semana', () => {
    expect(quando(new Date(local(1, 18)).toISOString(), agora)).toBe('hoje às 18h');
    expect(quando(new Date(local(2, 12)).toISOString(), agora)).toBe('amanhã às 12h');
    expect(quando(new Date(local(3, 9)).toISOString(), agora)).toMatch(/^\S+ às 9h$/);
  });

  it('frase da primeira chuva forte, ignorando chuva fraca e chuva improvável', () => {
    const faixas = [faixa(local(1, 15), 3), faixa(local(1, 18), 14, 0.3), faixa(local(2, 12), 14.3)];
    expect(fraseChuvaForte(faixas, agora)).toBe('Chuva forte amanhã às 12h');
    expect(fraseChuvaForte(faixas.slice(0, 2), agora)).toBeNull();
  });
});
