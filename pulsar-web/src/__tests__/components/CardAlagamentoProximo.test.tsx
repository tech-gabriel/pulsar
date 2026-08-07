import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CardAlagamentoProximo from '../../components/mapa/CardAlagamentoProximo';
import type { OcorrenciasProximasDto } from '../../types';

const base: OcorrenciasProximasDto = {
  total: 3, alagamentos: 2, inundacoes: 1, maisProximaMetros: 120, riscoElevado: false, chuvaMmH: 0,
};

describe('CardAlagamentoProximo', () => {
  it('mostra a contagem de ocorrencias perto', () => {
    render(<CardAlagamentoProximo dados={base} onFechar={vi.fn()} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/alagamento/i)).toBeInTheDocument();
  });

  it('nao mostra o badge de risco elevado quando riscoElevado=false', () => {
    render(<CardAlagamentoProximo dados={base} onFechar={vi.fn()} />);
    expect(screen.queryByText(/risco elevado/i)).toBeNull();
  });

  it('mostra o badge de risco elevado quando riscoElevado=true', () => {
    render(<CardAlagamentoProximo dados={{ ...base, riscoElevado: true, chuvaMmH: 12 }} onFechar={vi.fn()} />);
    expect(screen.getByText(/risco elevado/i)).toBeInTheDocument();
  });

  it('mostra estado vazio quando total=0', () => {
    render(<CardAlagamentoProximo dados={{ ...base, total: 0, alagamentos: 0, inundacoes: 0, maisProximaMetros: null }} onFechar={vi.fn()} />);
    expect(screen.getByText(/nenhum alagamento/i)).toBeInTheDocument();
  });

  it('chama onFechar ao clicar em fechar', () => {
    const onFechar = vi.fn();
    render(<CardAlagamentoProximo dados={base} onFechar={onFechar} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onFechar).toHaveBeenCalled();
  });
});
