import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

// Isola o teste do mapa/rede: mocka os hooks de dados e os componentes pesados
// (Leaflet/GSI/push) que a MapaPage monta. O objetivo é só provar que
// ?regiao=<slug> foca a região correta via setRegiaoSelecionadaNome.

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));

// Itaquera existe na "API" para o deep-link de subprefeitura achar pelo nome.
const ITAQUERA = { id: 's1', nome: 'Itaquera', latitude: 0, longitude: 0, scoreAtual: null, faixaRisco: 'BAIXO', temperaturaAtual: 20, ultimaLeitura: null, zona: 'Leste' };
const SUBS = [ITAQUERA];
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: SUBS, carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));

vi.mock('../../hooks/useFavoritos', () => ({
  useFavoritos: () => ({ favoritos: [], isFavorito: () => false, toggleFavorito: vi.fn(), carregando: false }),
}));

// Quem já viu o onboarding (marca no beforeEach) fica no mapa; push stubado sem rede.
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: 'ativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }) }));


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

// Mapa real (react-leaflet) não roda em jsdom — stub que expõe a sub selecionada.
vi.mock('../../components/mapa/MapaBase', () => ({
  default: ({ subSelecionada, zonaEmFoco }: { subSelecionada: { nome: string } | null; zonaEmFoco: string | null }) => (
    <div data-testid="mapa-base-stub">{subSelecionada?.nome ?? ''}|{zonaEmFoco ?? ''}</div>
  ),
}));

import MapaPage from '../../pages/MapaPage';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('pulsar-ativacao-vista-v1', '1');
  // O mount da MapaPage busca o geojson via fetch cru; sem stub, um fetch
  // relativo fora do browser derruba o teste. Rejeita pra cair no catch existente.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MapaPage deep-link', () => {
  it('?regiao=<zona> enquadra a zona no mapa, sem painel de zona', async () => {
    render(<MemoryRouter initialEntries={['/app?regiao=zona-leste']}><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('mapa-base-stub')).toHaveTextContent('|Leste'));
    expect(screen.queryByRole('heading', { name: 'Leste' })).not.toBeInTheDocument();
  });

  it('slug inválido não foca nada', async () => {
    render(<MemoryRouter initialEntries={['/app?regiao=hackerman']}><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('mapa-base-stub')).toHaveTextContent(/^|$/));
  });

  it('?regiao=<subprefeitura> abre o detalhe dela', async () => {
    render(<MemoryRouter initialEntries={['/app?regiao=itaquera']}><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Itaquera' }).length).toBeGreaterThan(0));
  });

  it('reage à troca do parâmetro com o mapa já aberto (sino, busca)', async () => {
    function Ir() { const navigate = useNavigate(); return <button onClick={() => navigate('/app?regiao=itaquera')}>ir</button>; }
    render(<MemoryRouter initialEntries={['/app']}><Ir /><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('mapa-base-stub')).toBeInTheDocument());
    expect(screen.queryAllByRole('heading', { name: 'Itaquera' })).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'ir' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Itaquera' }).length).toBeGreaterThan(0));
  });
});
