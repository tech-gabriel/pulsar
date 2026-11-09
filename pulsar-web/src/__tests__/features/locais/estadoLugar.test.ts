import { describe, it, expect } from 'vitest';
import { fraseAlagamento, fraseChuvaAgora, intensidadeChuva, modoDoMarcador, posicaoDaEtiqueta } from '../../../features/locais/estadoLugar';
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
    expect(fraseAlagamento([], 'Butantã')).toBe('Nenhum alagamento agora no Butantã');
    expect(fraseAlagamento(undefined, 'Butantã')).toBe('Nenhum alagamento agora no Butantã');
    expect(fraseAlagamento([ponto('Rua X')], 'Butantã')).toBe('Alagamento agora: Rua X');
    expect(fraseAlagamento([ponto('Rua X'), ponto('Av. Y'), ponto('Rua Z')], 'Butantã')).toBe('Alagamento agora: Rua X e mais 2');
  });
});

describe('posicaoDaEtiqueta', () => {
  const R = 19; const L = 100;
  it('abre para o lado oposto ao círculo da região, com haste curta quando ele está longe', () => {
    expect(posicaoDaEtiqueta({ dx: 60, dy: 0 }, [], R, L)).toEqual({ lado: 'esquerda', haste: 10 });
    expect(posicaoDaEtiqueta({ dx: -60, dy: 0 }, [], R, L)).toEqual({ lado: 'direita', haste: 10 });
  });
  it('com o lugar quase no centro da região, a haste passa do círculo', () => {
    // Círculo 25 px a oeste e 9 px acima (o trabalho na Praça da Sé): abre para a direita.
    const { lado, haste } = posicaoDaEtiqueta({ dx: -25, dy: -9 }, [], R, L);
    expect(lado).toBe('direita');
    expect(haste).toBe(10);
    // No centro exato: a haste cresce até a etiqueta começar depois do círculo.
    const centro = posicaoDaEtiqueta({ dx: 0, dy: 0 }, [], R, L);
    expect(4.5 + centro.haste).toBeGreaterThan(R);
  });
  it('troca de lado quando o preferido bate num círculo vizinho', () => {
    // Região a oeste, mas um vizinho logo à direita (a casa no Butantã com Pinheiros ao lado).
    expect(posicaoDaEtiqueta({ dx: -150, dy: 60 }, [{ dx: 70, dy: 5 }], R, L).lado).toBe('esquerda');
  });
  it('se os dois lados batem, fica no preferido', () => {
    expect(posicaoDaEtiqueta({ dx: -150, dy: 60 }, [{ dx: 70, dy: 5 }, { dx: -70, dy: 5 }], R, L).lado).toBe('direita');
  });
  it('círculo bem acima ou abaixo não estica a haste', () => {
    expect(posicaoDaEtiqueta({ dx: 0, dy: 60 }, [], R, L)).toEqual({ lado: 'direita', haste: 10 });
  });
});
