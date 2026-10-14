import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ sairTodos: vi.fn(), toast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nome: 'Ana', email: 'ana@x.com', perfil: 'CIDADAO', role: 'USUARIO', emailVerificado: true, emailPendente: null },
    logout: vi.fn(), atualizarPerfil: vi.fn(), recarregarUsuario: vi.fn().mockResolvedValue(undefined),
    reenviarConfirmacao: vi.fn(), sairDeTodosOsAparelhos: h.sairTodos,
  }),
}));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../components/ui/SobreCard', () => ({ default: () => null }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: h.toast }) }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({
  useNotificacoesPrefs: () => ({ prefs: { alertaAlto: true, alertaModerado: false, resumoDiario: false }, toggle: vi.fn() }),
}));
vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado: 'inativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }),
}));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [], toggleFavorito: vi.fn() }) }));

import ConfiguracoesPage from '../../pages/ConfiguracoesPage';

const abrirFolha = () => {
  render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Sair de todos os aparelhos' }));
};

describe('Configurações: sair de todos os aparelhos (SEC2, opção 1 + folha)', () => {
  beforeEach(() => { h.sairTodos.mockReset(); h.toast.mockReset(); });

  it('o link abre a folha com a explicação; Cancelar fecha sem sair', async () => {
    abrirFolha();
    expect(screen.getByRole('dialog', { name: 'Sair de todos os aparelhos?' })).toBeInTheDocument();
    expect(screen.getByText('A sessão termina no celular, no computador e aqui. Seus lugares e alertas continuam salvos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.sairTodos).not.toHaveBeenCalled();
  });

  it('confirmar mostra "Saindo…" e chama o sair de todos', async () => {
    h.sairTodos.mockReturnValue(new Promise(() => {}));
    abrirFolha();
    fireEvent.click(screen.getByRole('button', { name: 'Sair de todos' }));
    expect(await screen.findByRole('button', { name: 'Saindo…' })).toBeDisabled();
    expect(h.sairTodos).toHaveBeenCalled();
  });

  it('erro mantém a folha aberta, devolve o botão e avisa', async () => {
    h.sairTodos.mockRejectedValue(new Error('rede'));
    abrirFolha();
    fireEvent.click(screen.getByRole('button', { name: 'Sair de todos' }));
    await vi.waitFor(() => expect(h.toast).toHaveBeenCalledWith('Não foi possível sair de todos os aparelhos agora. Tente de novo em instantes.', 'error'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair de todos' })).toBeEnabled();
  });
});
