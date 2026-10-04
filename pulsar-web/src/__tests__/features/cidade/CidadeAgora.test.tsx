import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CidadeAgora from '../../../features/cidade/CidadeAgora';
import type { Area, ResumoCidade } from '../../../features/cidade/areas';

const itaquera = { id: 's1', nome: 'Itaquera', zona: 'Leste', faixaRisco: 'ALTO', scoreAtual: { valor: 78, faixa: 'ALTO', timestamp: '', perigoPrincipal: 'ALAGAMENTO' } } as Area;
const r = (o: Partial<ResumoCidade>): ResumoCidade => ({ alto: 0, moderado: 0, baixo: 30, pior: null, semDados: false, ...o });

describe('CidadeAgora', () => {
  it('risco alto: número, pior e quantas em atenção', () => {
    render(<CidadeAgora cidadeNome="São Paulo" resumo={r({ alto: 1, moderado: 5, pior: itaquera })} />);
    expect(screen.getByText('São Paulo agora')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('1 em risco alto, 5 em atenção');
    expect(screen.getByText('Pior: Itaquera · alagamento')).toBeInTheDocument();
  });
  it('dia tranquilo', () => {
    render(<CidadeAgora cidadeNome="São Paulo" resumo={r({ baixo: 32, pior: { ...itaquera, faixaRisco: 'BAIXO' } as Area })} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Tudo tranquilo em São Paulo');
  });
  it('sem dados não finge que está tranquilo', () => {
    render(<CidadeAgora cidadeNome="São Paulo" resumo={r({ baixo: 0, semDados: true })} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Sem dados de risco agora');
  });
  it('distribuição opcional', () => {
    render(<CidadeAgora cidadeNome="São Paulo" distribuicao resumo={r({ alto: 1, moderado: 5, baixo: 26, pior: itaquera })} />);
    expect(screen.getByText('26 baixo')).toBeInTheDocument();
  });
});
