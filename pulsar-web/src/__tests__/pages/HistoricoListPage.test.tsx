import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1' } }) }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [{ subprefeituraId: 's3' }], carregando: false }) }));
const s = (id: string, nome: string, zona: string) => ({ id, nome, zona, faixaRisco: 'BAIXO', scoreAtual: { valor: 10, faixa: 'BAIXO', timestamp: '' }, ultimaLeitura: null });
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({
  subprefeituras: [s('s1', 'Mooca', 'Leste'), s('s2', 'Butantã', 'Oeste'), s('s3', 'Penha', 'Leste')],
  carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null,
}) }));

import HistoricoListPage from '../../pages/HistoricoListPage';

describe('HistoricoListPage', () => {
  it('lista única: favoritas no topo, depois alfabética, zona como legenda', () => {
    const { container } = render(<MemoryRouter><HistoricoListPage /></MemoryRouter>);
    const nomes = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(nomes[0]).toMatch(/Penha/);
    expect(nomes[1]).toMatch(/Butantã/);
    expect(nomes[2]).toMatch(/Mooca/);
    expect(nomes[0]).toMatch(/Leste/);
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
  });

  it('busca por nome ou zona', () => {
    render(<MemoryRouter><HistoricoListPage /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oeste' } });
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
