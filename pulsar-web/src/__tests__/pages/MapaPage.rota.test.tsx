import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Rota no celular: os controles do mapa (camada, alagamentos e zoom) saem e voltam ao fechar.
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: [], carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));
vi.mock('../../hooks/useFavoritos', () => ({
  useFavoritos: () => ({ favoritos: [], isFavorito: () => false, toggleFavorito: vi.fn(), carregando: false }),
}));
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: 'ativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1', nome: 'Teste', role: 'USER' }, logout: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../components/notificacoes/ConvitePush', () => ({ default: () => null }));
// O zoom mora dentro do mapa real: o stub mostra se ele foi pedido.
vi.mock('../../components/mapa/MapaBase', () => ({
  default: ({ semZoom }: { semZoom?: boolean }) => <div data-testid="mapa-base-stub">{semZoom ? 'sem-zoom' : 'com-zoom'}</div>,
}));

import MapaPage from '../../pages/MapaPage';

beforeEach(() => {
  localStorage.setItem('pulsar-ativacao-vista-v1', '1');
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MapaPage: rota no celular', () => {
  it('esconde camada, alagamentos e zoom enquanto a rota está aberta', async () => {
    render(<MemoryRouter initialEntries={['/app']}><MapaPage /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Alagamentos' })).toBeInTheDocument();
    expect(screen.getByTestId('mapa-base-stub')).toHaveTextContent('com-zoom');
    const camada = screen.getByRole('button', { name: /escolher camada/ });
    expect(camada).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rota' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Alagamentos' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /escolher camada/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('mapa-base-stub')).toHaveTextContent('sem-zoom');

    fireEvent.click(screen.getByRole('button', { name: 'Fechar a rota' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Alagamentos' })).toBeInTheDocument());
    expect(screen.getByTestId('mapa-base-stub')).toHaveTextContent('com-zoom');
  });
});
