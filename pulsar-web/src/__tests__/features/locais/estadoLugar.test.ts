import { describe, it, expect } from 'vitest';
import { fraseAlagamento, fraseChuvaAgora, intensidadeChuva, modoDoMarcador } from '../../../features/locais/estadoLugar';
import type { PontoAlagamentoCge } from '../../../types';

const ponto = (via: string): PontoAlagamentoCge => ({ via, referencia: '', inicioUtc: '2026-11-09T18:00:00Z', transitavel: true });

describe('estado do lugar', () => {
  it('ponto na vista ampla, etiqueta a partir do zoom 12 arredondado', () => {
    expect(modoDoMarcador(11.4)).toBe('ponto');
    expect(modoDoMarcador(11.6)).toBe('etiqueta');
    expect(modoDoMarcador(14)).toBe('etiqueta');
  });

  it('faixas de intensidade iguais às do aviso', () => {
    expect(intensidadeChuva(0.49)).toBeNull();
    expect(intensidadeChuva(0.5)).toBe('fraca');
    expect(intensidadeChuva(2.49)).toBe('fraca');
    expect(intensidadeChuva(2.5)).toBe('moderada');
    expect(intensidadeChuva(10)).toBe('forte');
    expect(intensidadeChuva(undefined)).toBeNull();
  });

  it('chuva agora', () => {
    expect(fraseChuvaAgora(undefined, false)).toBe('Sem leitura agora');
    expect(fraseChuvaAgora(0, true)).toBe('Sem chuva agora');
    expect(fraseChuvaAgora(12, true)).toBe('Chuva forte agora');
  });

  it('alagamento da região', () => {
    expect(fraseAlagamento([], 'Butantã')).toBe('Nenhum alagamento agora em Butantã');
    expect(fraseAlagamento(undefined, 'Butantã')).toBe('Nenhum alagamento agora em Butantã');
    expect(fraseAlagamento([ponto('Rua X')], 'Butantã')).toBe('Alagamento agora: Rua X');
    expect(fraseAlagamento([ponto('Rua X'), ponto('Av. Y'), ponto('Rua Z')], 'Butantã')).toBe('Alagamento agora: Rua X e mais 2');
  });
});
