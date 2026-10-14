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

import AvisoConfirmarEmail from '../../components/auth/AvisoConfirmarEmail';

describe('AvisoConfirmarEmail', () => {
  beforeEach(() => {
    h.recarregar.mockReset().mockResolvedValue(undefined);
    h.reenviar.mockReset().mockResolvedValue(undefined);
    h.toast.mockReset();
  });

  it('não aparece para conta verificada', () => {
    h.usuario = { email: 'a@x.com', emailVerificado: true };
    render(<AvisoConfirmarEmail />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(h.recarregar).not.toHaveBeenCalled();
  });

  it('não aparece para sessão antiga sem o campo', () => {
    h.usuario = { email: 'a@x.com' };
    render(<AvisoConfirmarEmail />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('não verificada: mostra o aviso e atualiza o usuário uma vez', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    render(<AvisoConfirmarEmail />);
    expect(screen.getByRole('status')).toHaveTextContent('a@x.com');
    await waitFor(() => expect(h.recarregar).toHaveBeenCalledTimes(1));
  });

  it('reenviar mostra "Enviando…" desabilitado enquanto espera', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    let terminar: () => void = () => {};
    h.reenviar.mockReturnValue(new Promise<void>((r) => { terminar = r; }));
    render(<AvisoConfirmarEmail />);

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));

    const enviando = await screen.findByRole('button', { name: 'Enviando…' });
    expect(enviando).toBeDisabled();
    terminar();
    expect(await screen.findByRole('button', { name: 'Reenviar e-mail' })).toBeEnabled();
  });

  it('reenviar chama o endpoint e avisa', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    render(<AvisoConfirmarEmail />);
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));
    await waitFor(() => expect(h.reenviar).toHaveBeenCalled());
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Enviamos um novo link para a@x.com.', 'success'));
  });

  it('falha no reenvio avisa com erro', async () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    h.reenviar.mockRejectedValue(new Error('rede'));
    render(<AvisoConfirmarEmail />);
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Não foi possível reenviar agora. Tente de novo em instantes.', 'error'));
  });

  it('fechar esconde o aviso', () => {
    h.usuario = { email: 'a@x.com', emailVerificado: false };
    render(<AvisoConfirmarEmail />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
