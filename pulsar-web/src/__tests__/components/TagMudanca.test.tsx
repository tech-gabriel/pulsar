import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TagMudanca from '../../components/novidades/TagMudanca';

describe('TagMudanca', () => {
  it('mostra NOVO para tipo novo', () => {
    render(<TagMudanca tipo="novo" />);
    expect(screen.getByText('NOVO')).toBeInTheDocument();
  });

  it('mostra MELHORIA para tipo melhoria', () => {
    render(<TagMudanca tipo="melhoria" />);
    expect(screen.getByText('MELHORIA')).toBeInTheDocument();
  });

  it('mostra CORREÇÃO para tipo correcao', () => {
    render(<TagMudanca tipo="correcao" />);
    expect(screen.getByText('CORREÇÃO')).toBeInTheDocument();
  });
});
