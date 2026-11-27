import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import SeletorCidade from '../../../components/landing/SeletorCidade';
import LandingBusca from '../../../components/landing/LandingBusca';

describe('SeletorCidade', () => {
  it('marca a cidade atual e linka a outra', () => {
    render(<MemoryRouter><SeletorCidade atual="sao-paulo" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'São Paulo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Baixada Santista' })).toHaveAttribute('href', '/baixada-santista');
  });

  it('a landing mostra o seletor no lugar do rótulo antigo', () => {
    render(<MemoryRouter><LandingBusca /></MemoryRouter>);
    expect(screen.getByText('Risco de alagamento em')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Baixada Santista' })).toBeInTheDocument();
    expect(screen.queryByText('Risco de alagamento em São Paulo')).not.toBeInTheDocument();
  });
});
