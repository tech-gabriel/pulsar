import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AlagamentosCge from '../../../components/painel/AlagamentosCge';
import type { PontoAlagamentoCge } from '../../../types';

const ponto = (via: string, o: Partial<PontoAlagamentoCge> = {}): PontoAlagamentoCge => ({
  via, referencia: 'R Olivia Feder', inicioUtc: '2026-10-25T06:36:00Z', transitavel: false, ...o,
});

describe('AlagamentosCge', () => {
  it('some sem pontos (e sem o campo, como no snapshot do SSG)', () => {
    expect(render(<AlagamentosCge pontos={[]} />).container).toBeEmptyDOMElement();
    expect(render(<AlagamentosCge pontos={undefined} />).container).toBeEmptyDOMElement();
  });

  it('um ponto: via, referência, sem passagem e a fonte', () => {
    render(<AlagamentosCge pontos={[ponto('Tn Dirce Camargo')]} />);
    expect(screen.getByText('Alagamento agora')).toBeInTheDocument();
    expect(screen.getByText('Tn Dirce Camargo')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(/perto de R Olivia Feder\. Desde \d\d:\d\d, sem passagem/);
    expect(screen.getByText(/Fonte: CGE/)).toBeInTheDocument();
  });

  it('referência que é só número não aparece', () => {
    render(<AlagamentosCge pontos={[ponto('Tn Dirce Camargo', { referencia: '12', transitavel: true })]} />);
    expect(screen.getByRole('listitem').textContent).not.toContain('perto de');
    expect(screen.getByRole('listitem').textContent).not.toContain('sem passagem');
  });

  it('mais de três: lista três e conta o resto', () => {
    render(<AlagamentosCge pontos={['A', 'B', 'C', 'D', 'E'].map((v) => ponto(v))} />);
    expect(screen.getByText('5 pontos de alagamento agora')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('E mais 2 pontos.')).toBeInTheDocument();
  });

  it('copy sem travessão', () => {
    const { container } = render(<AlagamentosCge pontos={[ponto('A'), ponto('B')]} />);
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});
