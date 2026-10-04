import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1', nome: 'Gabriel Leite' } }) }));
vi.mock('../../analytics', () => ({ track: { passoVisto: vi.fn(), passoPulado: vi.fn(), ativacaoConcluida: vi.fn() } }));
const dados = vi.hoisted(() => ({
  adicionarVarios: vi.fn(),
  ativar: vi.fn(),
  favoritos: [] as { subprefeituraId: string }[],
}));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: dados.favoritos, carregando: false, adicionarVarios: dados.adicionarVarios, isFavorito: () => false, toggleFavorito: vi.fn() }) }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: { alertaAlto: true, alertaModerado: false, resumoDiario: false } }) }));
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: 'inativo', ocupado: false, ativar: dados.ativar, desativar: vi.fn() }) }));
vi.mock('../../features/ativacao/useInstalacao', () => ({ useInstalacao: () => ({ instalacao: 'indisponivel', plataforma: 'desktop', instalar: vi.fn() }), estaInstalado: () => false }));
vi.mock('../../hooks/useRegioes', () => ({ useRegioes: () => ({ regioes: [], carregando: false, erro: null }) }));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => [{ id: 's1', nome: 'Mooca', regiaoNome: 'Leste', faixaRisco: 'BAIXO' }] }));
vi.mock('../../hooks/useGeolocalizacao', () => ({ useGeolocalizacao: () => ({ detectar: vi.fn(), carregando: false }) }));

import BoasVindasPage from '../../pages/BoasVindasPage';

describe('BoasVindasPage', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
    dados.ativar.mockReset();
    dados.favoritos = [];
    dados.adicionarVarios.mockReset().mockImplementation(async (ids: string[]) => {
      dados.favoritos = ids.map((subprefeituraId) => ({ subprefeituraId }));
      return true;
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede no teste'))));
  });

  it('promessa → escolher → alerta → pronto, e marca como vista', async () => {
    dados.ativar.mockResolvedValue('ativo');
    render(<MemoryRouter><BoasVindasPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Começar' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Mooca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 1' }));
    await waitFor(() => expect(dados.adicionarVarios).toHaveBeenCalledWith(['s1']));
    fireEvent.click(await screen.findByRole('button', { name: 'Ativar alertas' }));
    expect(await screen.findByRole('heading', { name: 'Tudo pronto, Gabriel' })).toBeInTheDocument();
    // A marca é gravada num efeito logo após a tela aparecer: em CI lento, esperar por ela.
    await waitFor(() => expect(localStorage.getItem('pulsar-ativacao-vista-v1')).toBe('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver o mapa' }));
    expect(navigate).toHaveBeenCalledWith('/app', { replace: true });
  });

  it('pedido de notificação fechado sem resposta: fica no alerta', async () => {
    dados.ativar.mockResolvedValue('inativo');
    render(<MemoryRouter><BoasVindasPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Começar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Agora não' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ativar alertas' }));
    await waitFor(() => expect(dados.ativar).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Ativar alertas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Tudo pronto/ })).not.toBeInTheDocument();
  });

  it('alerta negado vai ao fim com a explicação', async () => {
    dados.ativar.mockResolvedValue('negado');
    render(<MemoryRouter><BoasVindasPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Começar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Agora não' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ativar alertas' }));
    expect(await screen.findByText(/ficaram bloqueados; dá para liberar nas configurações do navegador/)).toBeInTheDocument();
  });

  it('Pular na promessa encerra, marca e volta ao mapa com o deep-link', async () => {
    render(<MemoryRouter initialEntries={['/app/boas-vindas?regiao=itaquera']}><BoasVindasPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Pular' }));
    expect(localStorage.getItem('pulsar-ativacao-vista-v1')).toBe('1');
    expect(navigate).toHaveBeenCalledWith('/app?regiao=itaquera', { replace: true });
  });
});
