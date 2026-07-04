import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({
  track: { login: vi.fn(), cadastrou: vi.fn() },
  post: vi.fn(),
}));
vi.mock('../../analytics', () => ({ track: h.track }));
vi.mock('../../api/client', () => ({ default: { post: h.post, get: vi.fn() } }));

import { AuthProvider } from '../../contexts/AuthProvider';
import { useAuth } from '../../contexts/AuthContext';

const respostaLogin = {
  token: 'jwt',
  usuario: { id: 'u-1', nome: 'Ana', email: 'ana@example.com', perfil: 'CIDADAO', role: 'USUARIO' },
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    h.track.login.mockClear();
    h.track.cadastrou.mockClear();
    h.post.mockReset();
  });

  it('login emite track.login("email")', async () => {
    h.post.mockResolvedValue({ data: respostaLogin });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login({ email: 'a', senha: 'b' }); });
    expect(h.track.login).toHaveBeenCalledWith('email');
  });

  it('loginGoogle emite track.login("google")', async () => {
    h.post.mockResolvedValue({ data: respostaLogin });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.loginGoogle('id-token'); });
    expect(h.track.login).toHaveBeenCalledWith('google');
  });

  it('cadastrar emite track.cadastrou("email")', async () => {
    h.post.mockResolvedValue({ data: respostaLogin });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.cadastrar({ nome: 'Ana', email: 'a', senha: 'b' });
    });
    expect(h.track.cadastrou).toHaveBeenCalledWith('email');
  });
});
