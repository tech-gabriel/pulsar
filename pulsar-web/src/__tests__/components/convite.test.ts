import { describe, it, expect } from 'vitest';
import { escolherConvite } from '../../components/notificacoes/convite';
import type { Area } from '../../features/cidade/areas';

const area = (id: string, nome: string, faixaRisco: Area['faixaRisco'] = 'BAIXO') =>
  ({ id, nome, faixaRisco }) as unknown as Area;

describe('escolherConvite', () => {
  it('nomeia uma, duas ou mais favoritas sem lista longa', () => {
    expect(escolherConvite([area('a', 'Sé')], null).titulo).toBe('Alertas de Sé');
    expect(escolherConvite([area('a', 'Sé'), area('b', 'Mooca'), area('c', 'Penha'), area('d', 'Lapa')], null).titulo)
      .toBe('Alertas de Sé, Mooca e mais 2');
  });

  it('o risco agora vence a chuva prevista, e Alerta vence Atenção', () => {
    const chuva = { area: { id: 'a', nome: 'Sé' }, quando: 'hoje às 18h', mm: 12 };
    const c = escolherConvite([area('a', 'Sé', 'MODERADO'), area('b', 'Mooca', 'ALTO')], chuva);
    expect(c.titulo).toBe('Alerta agora em Mooca');
    expect(c.chave).toBe('risco:b:ALTO');
  });
});
