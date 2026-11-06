import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  toggle: vi.fn(), ativar: vi.fn(), desativar: vi.fn(), toggleTheme: vi.fn(),
  estado: 'inativo' as string,
  favoritos: [] as { subprefeituraId: string; nome: string }[],
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nome: 'Ana Souza', email: 'ana@x.com', perfil: 'CIDADAO', role: 'USUARIO', emailVerificado: true, emailPendente: null },
    logout: vi.fn(), atualizarPerfil: vi.fn(), recarregarUsuario: vi.fn().mockResolvedValue(undefined),
    reenviarConfirmacao: vi.fn(), sairDeTodosOsAparelhos: vi.fn(),
  }),
}));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../components/configuracoes/CasaTrabalhoCard', () => ({ default: () => null }));
vi.mock('../../components/ui/SobreCard', () => ({ default: () => null }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: h.toggleTheme }) }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({
  useNotificacoesPrefs: () => ({ prefs: { alertaAlto: true, alertaModerado: false, resumoDiario: false }, toggle: h.toggle }),
}));
vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado: h.estado, ocupado: false, ativar: h.ativar, desativar: h.desativar }),
}));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: h.favoritos, toggleFavorito: vi.fn() }) }));

import ConfiguracoesPage from '../../pages/ConfiguracoesPage';

const abrir = () => render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
const fav = (nome: string) => ({ subprefeituraId: nome, nome });

describe('Configurações em grupos', () => {
  beforeEach(() => {
    h.estado = 'inativo'; h.favoritos = [];
    [h.toggle, h.ativar, h.desativar, h.toggleTheme].forEach((f) => f.mockReset());
  });

  it('grupos na ordem combinada', () => {
    abrir();
    expect(screen.getAllByRole('heading', { level: 2 }).map((e) => e.textContent))
      .toEqual(['Conta', 'Seus lugares', 'Avisos', 'Aparência']);
  });

  it('a linha da conta abre a edição de perfil no lugar', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil, Ana Souza' }));
    expect(screen.getByRole('form', { name: 'Editar perfil' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('ana@x.com · Cidadão')).toBeInTheDocument();
  });

  it('avisos desligados: Ativar chama a inscrição de push', () => {
    abrir();
    expect(screen.getByText('Desligados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ativar avisos neste aparelho' }));
    expect(h.ativar).toHaveBeenCalled();
  });

  it('avisos ligados: Desativar desliga o push', () => {
    h.estado = 'ativo';
    abrir();
    expect(screen.getByText('Ligados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(h.desativar).toHaveBeenCalled();
  });

  it('navegador bloqueou: explica como reativar', () => {
    h.estado = 'negado';
    abrir();
    expect(screen.getByText(/Reative a permissão nas configurações do navegador/)).toBeInTheDocument();
  });

  it('preferências são interruptores que mostram e alternam o estado', () => {
    abrir();
    const alertas = screen.getByRole('switch', { name: /^Alertas/ });
    expect(alertas).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /^Resumo diário/ })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(alertas);
    expect(h.toggle).toHaveBeenCalledWith('alertaAlto');
  });

  it('tema escuro é um interruptor desligado no tema claro', () => {
    abrir();
    const tema = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(tema).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(tema);
    expect(h.toggleTheme).toHaveBeenCalled();
  });

  it('subprefeituras: resume os nomes e leva à tela delas', () => {
    h.favoritos = ['Itaquera', 'Mooca', 'Vila Mariana', 'Pinheiros', 'Sé'].map(fav);
    abrir();
    const linha = screen.getByRole('link', { name: /Subprefeituras que acompanho/ });
    expect(linha).toHaveAttribute('href', '/app/configuracoes/subprefeituras');
    expect(linha).toHaveTextContent('Itaquera, Mooca, Vila Mariana e mais 2');
    expect(linha).toHaveTextContent('5');
  });

  it('subprefeituras: com poucas, lista todas', () => {
    h.favoritos = ['Mooca', 'Sé'].map(fav);
    abrir();
    expect(screen.getByRole('link', { name: /Subprefeituras/ })).toHaveTextContent('Mooca e Sé');
  });

  it('a lista de subprefeituras saiu da página principal', () => {
    h.favoritos = [fav('Mooca')];
    abrir();
    expect(screen.queryByRole('button', { name: 'Deixar de acompanhar Mooca' })).toBeNull();
  });
});
