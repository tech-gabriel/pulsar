import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }));
const useHistorico = vi.fn((id: string | null) => ({ historico: id ? { subprefeituraNome: 'x', leituras: [] } : null, carregando: false, erro: null, recarregar: vi.fn() }));
vi.mock('../../hooks/useHistorico', () => ({ useHistorico: (id: string | null) => useHistorico(id) }));
const s = (id: string, nome: string) => ({ id, nome, zona: 'Oeste', faixaRisco: 'BAIXO', scoreAtual: null, ultimaLeitura: null });
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({
  subprefeituras: [s('9b1f0c2e-0000-4000-8000-000000000001', 'Butantã')],
  carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null,
}) }));

import HistoricoPage from '../../pages/HistoricoPage';

function Url() { return <span data-testid="url">{useLocation().pathname}</span>; }
const abrir = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/app/historico/:area" element={<><HistoricoPage /><Url /></>} /></Routes>
  </MemoryRouter>,
);

describe('HistoricoPage: endereço pelo nome, não pelo id do banco', () => {
  beforeEach(() => useHistorico.mockClear());

  it('resolve o nome da URL para o id da subprefeitura', () => {
    abrir('/app/historico/butanta');
    expect(useHistorico).toHaveBeenLastCalledWith('9b1f0c2e-0000-4000-8000-000000000001');
    expect(screen.getByTestId('url').textContent).toBe('/app/historico/butanta');
  });

  it('link antigo com o id troca a URL pelo nome', () => {
    abrir('/app/historico/9b1f0c2e-0000-4000-8000-000000000001');
    expect(screen.getByTestId('url').textContent).toBe('/app/historico/butanta');
  });

  it('nome desconhecido mostra "não encontrada" e não consulta a API', () => {
    abrir('/app/historico/nao-existe');
    expect(screen.getByText('Subprefeitura não encontrada')).toBeInTheDocument();
    expect(useHistorico).toHaveBeenLastCalledWith(null);
  });
});
