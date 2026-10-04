import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mesmos stubs do teste de deep-link; aqui o alvo é o redirecionamento para o onboarding.

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

// Itaquera existe na "API" para o deep-link de subprefeitura achar pelo nome.
const ITAQUERA = { id: 's1', nome: 'Itaquera', latitude: 0, longitude: 0, scoreAtual: null, faixaRisco: 'BAIXO', temperaturaAtual: 20, ultimaLeitura: null, regiaoId: 'r1', regiaoNome: 'Leste' };
const SUBS = [ITAQUERA];
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => SUBS }));

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

// Mapa real (react-leaflet) não roda em jsdom — stub que expõe a sub selecionada.
vi.mock('../../components/mapa/MapaBase', () => ({
  default: ({ subSelecionada }: { subSelecionada: { nome: string } | null }) => (
    <div data-testid="mapa-base-stub">{subSelecionada?.nome ?? ''}</div>
  ),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
const estado = vi.hoisted(() => ({ favoritos: [] as unknown[], push: 'inativo', instalacao: 'prompt' }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: estado.favoritos, isFavorito: () => false, toggleFavorito: vi.fn(), carregando: false }) }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: { alertaAlto: true, alertaModerado: false, resumoDiario: false } }) }));
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: estado.push, ocupado: false, ativar: vi.fn(), desativar: vi.fn() }) }));
vi.mock('../../features/ativacao/useInstalacao', () => ({ useInstalacao: () => ({ instalacao: estado.instalacao, plataforma: 'desktop', instalar: vi.fn() }), estaInstalado: () => false }));

import MapaPage from '../../pages/MapaPage';

const espera = () => new Promise((r) => setTimeout(r, 50));
const naoRedirecionou = () => expect(navigate).not.toHaveBeenCalledWith(expect.stringContaining('/app/boas-vindas'), expect.anything());

beforeEach(() => {
  navigate.mockClear();
  localStorage.clear();
  estado.favoritos = []; estado.push = 'inativo'; estado.instalacao = 'prompt';
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MapaPage → boas-vindas', () => {
  it('sem favoritas vai para o onboarding', async () => {
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/boas-vindas', { replace: true }));
  });

  it('leva junto o deep-link (?regiao) para o mapa abrir focado depois', async () => {
    render(<MemoryRouter initialEntries={['/app?regiao=itaquera']}><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/boas-vindas?regiao=itaquera', { replace: true }));
  });

  it('com favoritas no navegador, fica no mapa', async () => {
    estado.favoritos = [{ subprefeituraId: 's1' }];
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await espera();
    naoRedirecionou();
  });

  it('quem já pulou não é levado de novo (sem loop)', async () => {
    localStorage.setItem('pulsar-ativacao-vista-v1', '1');
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await espera();
    naoRedirecionou();
  });

  it('push negado no app instalado não redireciona', async () => {
    estado.favoritos = [{ subprefeituraId: 's1' }]; estado.push = 'negado'; estado.instalacao = 'instalado';
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await espera();
    naoRedirecionou();
  });

  it('espera o push carregar antes de decidir', async () => {
    estado.favoritos = [{ subprefeituraId: 's1' }]; estado.push = 'carregando'; estado.instalacao = 'instalado';
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await espera();
    naoRedirecionou();
  });

  it('app instalado sem alerta retoma no onboarding', async () => {
    estado.favoritos = [{ subprefeituraId: 's1' }]; estado.instalacao = 'instalado';
    render(<MemoryRouter><MapaPage /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/boas-vindas', { replace: true }));
  });
});
