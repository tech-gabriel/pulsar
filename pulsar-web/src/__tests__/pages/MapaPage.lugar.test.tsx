import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

// Casa e trabalho no mapa (F4b): tocar no marcador e o deep link do aviso (?lugar=casa).

const h = vi.hoisted(() => ({ locais: {} as Record<string, unknown>, carregando: false, track: vi.fn() }));

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
const ITAQUERA = { id: 's1', nome: 'Itaquera', latitude: 0, longitude: 0, scoreAtual: null, faixaRisco: 'BAIXO', temperaturaAtual: 20, ultimaLeitura: null, zona: 'Leste' };
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: [ITAQUERA], carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [], isFavorito: () => false, toggleFavorito: vi.fn(), carregando: false, recarregar: vi.fn() }) }));
vi.mock('../../hooks/useLocaisSalvos', () => ({ useLocaisSalvos: () => ({ locais: h.locais, carregando: h.carregando, salvar: vi.fn(), apagar: vi.fn() }) }));
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: 'ativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }) }));
vi.mock('../../hooks/usePrevisaoSubprefeitura', () => ({ usePrevisaoSubprefeitura: () => ({ faixas: [], erro: false }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1', nome: 'Teste', role: 'USER' }, logout: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../analytics', () => ({
  track: new Proxy({}, { get: (_, k) => (k === 'abriuLugar' ? h.track : () => {}) }),
  capturarPageview: () => {},
}));
vi.mock('../../components/notificacoes/ConvitePush', () => ({ default: () => null }));

// Mapa real não roda em jsdom: o stub mostra o lugar em foco e deixa "tocar" na casa.
vi.mock('../../components/mapa/MapaBase', () => ({
  default: ({ lugares, onTocarLugar, lugarEmFoco, subSelecionada }: {
    lugares?: { tipo: string }[]; onTocarLugar?: (t: string) => void;
    lugarEmFoco?: { local: { rotulo: string }; toque: number } | null; subSelecionada?: { nome: string } | null;
  }) => (
    <div data-testid="mapa-base-stub">
      <span data-testid="foco">{lugarEmFoco ? `${lugarEmFoco.local.rotulo}#${lugarEmFoco.toque}` : ''}</span>
      <span data-testid="sub">{subSelecionada?.nome ?? ''}</span>
      {lugares?.map((l) => <button key={l.tipo} onClick={() => onTocarLugar?.(l.tipo)}>marcador {l.tipo}</button>)}
    </div>
  ),
}));

import MapaPage from '../../pages/MapaPage';

function Busca() {
  return <span data-testid="busca">{useLocation().search}</span>;
}
const abrir = (url: string) => render(<MemoryRouter initialEntries={[url]}><MapaPage /><Busca /></MemoryRouter>);
const CASA = { tipo: 'CASA', latitude: 0, longitude: 0, rotulo: 'Rua Alvarenga, 1020', subprefeituraId: 's1', subprefeituraNome: 'Itaquera' };

beforeEach(() => {
  vi.clearAllMocks();
  h.locais = {}; h.carregando = false;
  localStorage.setItem('pulsar-ativacao-vista-v1', '1');
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MapaPage: casa e trabalho', () => {
  it('?lugar=casa abre a folha da casa, foca o mapa nela e limpa o parâmetro', async () => {
    h.locais = { CASA };
    abrir('/app?lugar=casa');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Casa' })).toBeInTheDocument());
    expect(screen.getByTestId('foco')).toHaveTextContent('Rua Alvarenga, 1020#');
    await waitFor(() => expect(screen.getByTestId('busca')).toHaveTextContent(/^$/));
  });

  it('?lugar=casa sem casa salva não abre nada e limpa o parâmetro', async () => {
    abrir('/app?lugar=casa');
    await waitFor(() => expect(screen.getByTestId('busca')).toHaveTextContent(/^$/));
    expect(screen.queryByRole('heading', { name: 'Casa' })).toBeNull();
  });

  it('com os locais ainda carregando, espera em vez de descartar o parâmetro', async () => {
    h.carregando = true;
    abrir('/app?lugar=casa');
    await waitFor(() => expect(screen.getByTestId('mapa-base-stub')).toBeInTheDocument());
    expect(screen.getByTestId('busca')).toHaveTextContent('?lugar=casa');
  });

  it('tocar de novo no mesmo marcador volta a aproximar (novo toque, novo foco)', async () => {
    h.locais = { CASA };
    abrir('/app');
    const marcador = await screen.findByRole('button', { name: 'marcador CASA' });
    fireEvent.click(marcador);
    const primeiro = screen.getByTestId('foco').textContent;
    fireEvent.click(marcador);
    expect(screen.getByTestId('foco').textContent).not.toBe(primeiro);
  });

  it('link de região com a casa aberta troca para a região (sino, push de alerta)', async () => {
    h.locais = { CASA };
    function Ir() { const navigate = useNavigate(); return <button onClick={() => navigate('/app?regiao=itaquera')}>ir</button>; }
    render(<MemoryRouter initialEntries={['/app']}><Ir /><MapaPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'marcador CASA' }));
    expect(screen.getByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ir' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Casa' })).toBeNull());
    expect(screen.getAllByRole('heading', { name: 'Itaquera' }).length).toBeGreaterThan(0);
  });

  it('?lugar=casa sem casa, com o trabalho aberto, não registra abertura pelo aviso', async () => {
    h.locais = { TRABALHO: { ...CASA, tipo: 'TRABALHO' } };
    function Ir() { const navigate = useNavigate(); return <button onClick={() => navigate('/app?lugar=casa')}>ir</button>; }
    render(<MemoryRouter initialEntries={['/app']}><Ir /><MapaPage /><Busca /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'marcador TRABALHO' }));
    h.track.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'ir' }));
    await waitFor(() => expect(screen.getByTestId('busca')).toHaveTextContent(/^$/));
    expect(h.track).not.toHaveBeenCalled();
  });

  it('tocar no marcador abre a folha; "Ver Itaquera" troca para o detalhe da região', async () => {
    h.locais = { CASA };
    abrir('/app');
    fireEvent.click(await screen.findByRole('button', { name: 'marcador CASA' }));
    expect(screen.getByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Itaquera' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Casa' })).toBeNull());
    expect(screen.getAllByRole('heading', { name: 'Itaquera' }).length).toBeGreaterThan(0);
  });
});
