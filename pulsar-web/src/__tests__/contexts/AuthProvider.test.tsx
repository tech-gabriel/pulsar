import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({
  track: { login: vi.fn(), cadastrou: vi.fn() },
  post: vi.fn(),
  get: vi.fn(),
}));
vi.mock('../../analytics', () => ({ track: h.track }));
vi.mock('../../api/client', () => ({ default: { post: h.post, get: h.get }, URL_SESSAO_ENCERRADA: '/login?sessao=encerrada' }));
const nav = vi.hoisted(() => ({ irPara: vi.fn() }));
vi.mock('../../utils/navegacao', () => nav);

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

  it('loginGoogle de conta existente emite track.login("google")', async () => {
    h.post.mockResolvedValue({ data: { ...respostaLogin, novoUsuario: false } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.loginGoogle('id-token'); });
    expect(h.track.login).toHaveBeenCalledWith('google');
    expect(h.track.cadastrou).not.toHaveBeenCalled();
  });

  // O /auth/google cadastra de forma implícita. Sem distinguir os dois casos, todo
  // cadastro via Google era contado como login e sumia do funil de aquisição.
  it('loginGoogle que cria a conta emite track.cadastrou("google")', async () => {
    h.post.mockResolvedValue({ data: { ...respostaLogin, novoUsuario: true } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.loginGoogle('id-token'); });
    expect(h.track.cadastrou).toHaveBeenCalledWith('google');
    expect(h.track.login).not.toHaveBeenCalled();
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

describe('AuthProvider verificação de e-mail', () => {
  beforeEach(() => {
    localStorage.clear();
    h.post.mockReset();
    h.get.mockReset();
  });

  it('recarregarUsuario busca /usuarios/me e atualiza o usuário e o storage', async () => {
    h.post.mockResolvedValue({ data: { ...respostaLogin, usuario: { ...respostaLogin.usuario, emailVerificado: false } } });
    h.get.mockResolvedValue({ data: { ...respostaLogin.usuario, emailVerificado: true } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login({ email: 'a', senha: 'b' }); });

    await act(async () => { await result.current.recarregarUsuario(); });

    expect(h.get).toHaveBeenCalledWith('/usuarios/me');
    expect(result.current.usuario?.emailVerificado).toBe(true);
    expect(JSON.parse(localStorage.getItem('pulsar_usuario')!).emailVerificado).toBe(true);
  });

  it('reenviarConfirmacao chama o endpoint', async () => {
    h.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.reenviarConfirmacao(); });
    expect(h.post).toHaveBeenCalledWith('/usuarios/me/reenviar-confirmacao');
  });
});

describe('AuthProvider sair de todos os aparelhos (SEC2)', () => {
  beforeEach(() => {
    localStorage.clear();
    h.post.mockReset();
    nav.irPara.mockReset();
  });

  it('chama o endpoint, limpa a sessão e vai ao login com o aviso', async () => {
    h.post.mockResolvedValue({ data: respostaLogin });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login({ email: 'a', senha: 'b' }); });
    h.post.mockResolvedValue({ status: 204 });

    await act(async () => { await result.current.sairDeTodosOsAparelhos(); });

    expect(h.post).toHaveBeenCalledWith('/usuarios/me/sair-de-todos');
    expect(localStorage.getItem('pulsar_token')).toBeNull();
    expect(nav.irPara).toHaveBeenCalledWith('/login?sessao=encerrada');
  });

  it('falha não apaga a sessão local', async () => {
    h.post.mockResolvedValue({ data: respostaLogin });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login({ email: 'a', senha: 'b' }); });
    h.post.mockRejectedValue(new Error('rede'));

    await act(async () => { await expect(result.current.sairDeTodosOsAparelhos()).rejects.toThrow(); });

    expect(localStorage.getItem('pulsar_token')).toBe('jwt');
    expect(nav.irPara).not.toHaveBeenCalled();
  });
});
