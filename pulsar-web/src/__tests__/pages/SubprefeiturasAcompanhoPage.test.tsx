import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  toggleFavorito: vi.fn(),
  favoritos: [] as { subprefeituraId: string; nome: string; regiaoNome: string }[],
}));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: h.favoritos, toggleFavorito: h.toggleFavorito }) }));

import SubprefeiturasAcompanhoPage from '../../pages/SubprefeiturasAcompanhoPage';

const abrir = () => render(<MemoryRouter><SubprefeiturasAcompanhoPage /></MemoryRouter>);

describe('Subprefeituras que acompanho', () => {
  beforeEach(() => { h.toggleFavorito.mockReset(); h.favoritos = []; });

  it('volta para Configurações', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: 'Subprefeituras que acompanho' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/app/configuracoes');
  });

  it('lista as favoritas com a zona e remove pela estrela de sempre', () => {
    h.favoritos = [
      { subprefeituraId: 's1', nome: 'Mooca', regiaoNome: 'Leste' },
      { subprefeituraId: 's2', nome: 'Sé', regiaoNome: 'Centro' },
    ];
    abrir();
    expect(screen.getByText('Mooca')).toBeInTheDocument();
    expect(screen.getByText('· Leste')).toBeInTheDocument();
    expect(screen.getByText('Para acompanhar outra, toque na estrela dela no mapa.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deixar de acompanhar Sé' }));
    expect(h.toggleFavorito).toHaveBeenCalledWith('s2');
  });

  it('sem favoritas: mensagem curta e link para o mapa', () => {
    abrir();
    expect(screen.getByText(/Você ainda não acompanha nenhuma/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir o mapa' })).toHaveAttribute('href', '/app');
  });
});
