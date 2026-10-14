import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  usuario: null as null | { email: string; emailVerificado?: boolean },
  recarregar: vi.fn(),
  reenviar: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: h.usuario, recarregarUsuario: h.recarregar, reenviarConfirmacao: h.reenviar }),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: h.toast }) }));

import CartaoConfirmarEmail from '../../components/auth/CartaoConfirmarEmail';

describe('CartaoConfirmarEmail', () => {
  beforeEach(() => {
    h.recarregar.mockReset().mockResolvedValue(undefined);
    h.reenviar.mockReset().mockResolvedValue(undefined);
    h.toast.mockReset();
  });

  it('não aparece para conta verificada nem para sessão antiga sem o campo', () => {
    for (const usuario of [{ email: 'a@x.com', emailVerificado: true }, { email: 'a@x.com' }]) {
      h.usuario = usuario;
      const { container, unmount } = render(<CartaoConfirmarEmail variante="configuracoes" />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(h.recarregar).not.toHaveBeenCalled();
  });

  it('Configurações: título, e-mail e reenvio; atualiza o usuário uma vez', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    render(<CartaoConfirmarEmail variante="configuracoes" />);
    expect(screen.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
    expect(screen.getByText('a@x.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar e-mail' })).toBeInTheDocument();
    await waitFor(() => expect(h.recarregar).toHaveBeenCalledTimes(1));
  });

  it('boas-vindas: fala em último passo e oferece reenvio para quem não recebeu', () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    render(<CartaoConfirmarEmail variante="boas-vindas" />);
    expect(screen.getByRole('heading', { name: 'Último passo: confirme seu e-mail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não chegou? Reenviar' })).toBeInTheDocument();
  });

  it('reenviar mostra "Enviando…" desabilitado enquanto espera', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    let terminar: () => void = () => {};
    h.reenviar.mockReturnValue(new Promise<void>((r) => { terminar = r; }));
    render(<CartaoConfirmarEmail variante="configuracoes" />);

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));

    const enviando = await screen.findByRole('button', { name: 'Enviando…' });
    expect(enviando).toBeDisabled();
    terminar();
    expect(await screen.findByRole('button', { name: 'Reenviar e-mail' })).toBeEnabled();
    expect(h.toast).toHaveBeenCalledWith('Enviamos um novo link para a@x.com.', 'success');
  });

  it('falha no reenvio avisa com erro', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    h.reenviar.mockRejectedValue(new Error('rede'));
    render(<CartaoConfirmarEmail variante="boas-vindas" />);
    fireEvent.click(screen.getByRole('button', { name: 'Não chegou? Reenviar' }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Não foi possível reenviar agora. Tente de novo em instantes.', 'error'));
  });
});
