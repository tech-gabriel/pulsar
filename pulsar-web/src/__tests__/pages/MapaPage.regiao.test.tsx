import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Isola o teste do mapa/rede: mocka os hooks de dados e os componentes pesados
// (Leaflet/GSI/push) que a MapaPage monta. O objetivo é só provar que
// ?regiao=<slug> foca a região correta via setRegiaoSelecionadaNome.

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));

vi.mock('../../hooks/useRegioes', () => ({
  useRegioes: () => ({
    regioes: [
      { id: 'r1', nome: 'Leste', scoreAgregado: 20, faixaRisco: 'BAIXO', totalSubprefeituras: 12, ultimaAtualizacao: '2026-07-12T00:00:00Z' },
      { id: 'r2', nome: 'Sul', scoreAgregado: 15, faixaRisco: 'BAIXO', totalSubprefeituras: 8, ultimaAtualizacao: '2026-07-12T00:00:00Z' },
    ],
    carregando: false,
    erro: null,
    recarregar: vi.fn(),
    ultimaAtualizacao: null,
  }),
}));

vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => [] }));

vi.mock('../../hooks/useFavoritos', () => ({
  useFavoritos: () => ({ isFavorito: () => false, toggleFavorito: vi.fn() }),
}));

vi.mock('../../hooks/useOnboarding', () => ({
  useOnboarding: () => ({ aberto: false, concluir: vi.fn() }),
}));

// DetalheRegiao consome este hook para buscar o detalhe da região selecionada;
// mockamos para exibir "Leste" sem rede (regiaoId 'r1' == região Leste).
vi.mock('../../hooks/useRegiaoDetalhe', () => ({
  useRegiaoDetalhe: (regiaoId: string | null) => ({
    regiao: regiaoId
      ? {
          id: regiaoId,
          nome: regiaoId === 'r1' ? 'Leste' : 'Sul',
          scoreAgregado: 20,
          faixaRisco: 'BAIXO',
          totalSubprefeituras: 0,
          ultimaAtualizacao: '2026-07-12T00:00:00Z',
          subprefeituras: [],
        }
      : null,
    carregando: false,
    erro: null,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: { id: 'u1', nome: 'Teste', role: 'USER' }, logout: vi.fn() }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// Header e ConvitePush puxam contextos/hooks (tema, alertas, push) irrelevantes
// para este teste de foco de região — stubados para isolar o mapa.
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../components/notificacoes/ConvitePush', () => ({ default: () => null }));

// Mapa real (react-leaflet) não roda em jsdom — stub.
vi.mock('../../components/mapa/MapaBase', () => ({ default: () => <div data-testid="mapa-base-stub" /> }));

import MapaPage from '../../pages/MapaPage';

beforeEach(() => {
  vi.clearAllMocks();
  // O mount da MapaPage busca o geojson via fetch cru; sem stub, um fetch
  // relativo fora do browser derruba o teste. Rejeita pra cair no catch existente.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MapaPage deep-link de região', () => {
  it('foca a região quando ?regiao=<slug> válido está na URL', async () => {
    render(
      <MemoryRouter initialEntries={['/app?regiao=zona-leste']}>
        <MapaPage />
      </MemoryRouter>,
    );
    // O painel de detalhe da região focada mostra "Leste" no header (h2).
    // (getByText falha aqui: o nome também aparece na lista de regiões do
    // drawer mobile, sempre montada — por isso a asserção mira o heading.)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Leste' })).toBeInTheDocument());
  });

  it('não foca nenhuma região quando o slug é inválido', async () => {
    render(
      <MemoryRouter initialEntries={['/app?regiao=hackerman']}>
        <MapaPage />
      </MemoryRouter>,
    );
    // Sem região selecionada: o detalhe (com header "Leste"/"Sul") não aparece.
    await waitFor(() => expect(screen.getByTestId('mapa-base-stub')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Leste' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sul' })).not.toBeInTheDocument();
  });
});
