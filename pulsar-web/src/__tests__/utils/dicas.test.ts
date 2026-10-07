import { describe, it, expect } from 'vitest';
import { blocosDeDicas } from '../../utils/dicas';
import type { DicaDto, ScoreDto } from '../../types';

const d = (categoria: DicaDto['categoria'], faixa: DicaDto['faixa'], ordem: number): DicaDto =>
  ({ id: `${categoria}${faixa}${ordem}`, categoria, faixa, titulo: `${categoria} ${ordem}`, descricao: '', ordem });
const catalogo = [
  ...[4, 2, 1, 3].map((o) => d('ALAGAMENTO', 'ALTO', o)),
  ...[1, 2, 3].map((o) => d('CALOR', 'MODERADO', o)),
  ...[1, 2, 3].map((o) => d('VENTO', 'MODERADO', o)),
];
const score = (comp: Partial<Record<'alagamento' | 'vento' | 'calor', ScoreDto['faixa']>>, principal: ScoreDto['perigoPrincipal'] = 'ALAGAMENTO'): ScoreDto => ({
  valor: 70, faixa: 'ALTO', timestamp: '', perigoPrincipal: principal,
  componentes: {
    alagamento: { valor: 0, faixa: comp.alagamento ?? 'BAIXO' },
    vento: { valor: 0, faixa: comp.vento ?? 'BAIXO' },
    calor: { valor: 0, faixa: comp.calor ?? 'BAIXO' },
  },
});

describe('blocosDeDicas', () => {
  it('principal primeiro, depois os outros perigos ativos', () => {
    const b = blocosDeDicas(score({ alagamento: 'ALTO', calor: 'MODERADO' }, 'CALOR'), catalogo);
    expect(b.map((x) => [x.perigo, x.faixa])).toEqual([['CALOR', 'MODERADO'], ['ALAGAMENTO', 'ALTO']]);
  });

  it('no máximo 3 dicas por perigo, na ordem do catálogo', () => {
    const [alag] = blocosDeDicas(score({ alagamento: 'ALTO' }), catalogo);
    expect(alag.dicas.map((x) => x.ordem)).toEqual([1, 2, 3]);
  });

  it('perigo em Tranquilo não aparece', () => {
    expect(blocosDeDicas(score({ vento: 'BAIXO' }), catalogo)).toEqual([]);
  });

  it('sem dica no catálogo para o perigo, o bloco some', () => {
    expect(blocosDeDicas(score({ vento: 'ALTO' }), catalogo)).toEqual([]);
  });

  it('score sem componentes usa o perigo principal com a faixa geral', () => {
    const antigo: ScoreDto = { valor: 50, faixa: 'MODERADO', timestamp: '', perigoPrincipal: 'CALOR' };
    expect(blocosDeDicas(antigo, catalogo).map((x) => x.perigo)).toEqual(['CALOR']);
  });

  it('sem score ou catálogo vazio, nada', () => {
    expect(blocosDeDicas(null, catalogo)).toEqual([]);
    expect(blocosDeDicas(score({ alagamento: 'ALTO' }), [])).toEqual([]);
  });
});
