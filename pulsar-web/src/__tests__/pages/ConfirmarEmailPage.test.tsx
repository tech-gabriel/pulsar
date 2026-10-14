import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ post: vi.fn(), recarregar: vi.fn(), autenticado: false }));
vi.mock('../../api/client', () => ({ default: { post: h.post } }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ estaAutenticado: h.autenticado, recarregarUsuario: h.recarregar }),
}));

import ConfirmarEmailPage from '../../pages/ConfirmarEmailPage';

function abrir(url: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}><ConfirmarEmailPage /></MemoryRouter>
    </StrictMode>,
  );
}

describe('ConfirmarEmailPage', () => {
  beforeEach(() => {
    h.post.mockReset();
    h.recarregar.mockReset().mockResolvedValue(undefined);
    h.autenticado = false;
  });

  it('mostra o carregamento enquanto confirma', async () => {
    h.post.mockReturnValue(new Promise(() => {}));
    abrir('/confirmar-email?token=abc');
    expect(await screen.findByRole('heading', { name: 'Confirmando seu e-mail' })).toBeInTheDocument();
  });

  it('confirma uma única vez mesmo em StrictMode e mostra sucesso', async () => {
    h.post.mockResolvedValue({ status: 204 });
    abrir('/confirmar-email?token=abc-123');
    expect(await screen.findByRole('heading', { name: 'E-mail confirmado' })).toBeInTheDocument();
    expect(h.post).toHaveBeenCalledTimes(1);
    expect(h.post).toHaveBeenCalledWith('/auth/confirmar-email', { token: 'abc-123' });
  });

  it('logado: atualiza o usuário depois de confirmar', async () => {
    h.autenticado = true;
    h.post.mockResolvedValue({ status: 204 });
    abrir('/confirmar-email?token=abc');
    await waitFor(() => expect(h.recarregar).toHaveBeenCalled());
  });

  it('link expirado mostra a mensagem do servidor', async () => {
    h.post.mockRejectedValue({ response: { data: { mensagem: 'Esse link de confirmação expirou ou já foi usado. Peça um novo.' } } });
    abrir('/confirmar-email?token=velho');
    expect(await screen.findByText('Esse link de confirmação expirou ou já foi usado. Peça um novo.')).toBeInTheDocument();
  });

  it('sem token não chama o servidor', async () => {
    abrir('/confirmar-email');
    expect(await screen.findByRole('heading', { name: 'Link incompleto' })).toBeInTheDocument();
    expect(h.post).not.toHaveBeenCalled();
  });
});
