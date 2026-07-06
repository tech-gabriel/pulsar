import { useState, useCallback, type ReactNode } from 'react';
import api from '../api/client';
import { track } from '../analytics';
import type {
  AtualizarPerfilRequestDto,
  CadastroRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  UsuarioDto,
} from '../types';
import { AuthContext } from './AuthContext';

function carregarDoStorage(): { usuario: UsuarioDto | null; token: string | null } {
  try {
    const token = localStorage.getItem('pulsar_token');
    const raw = localStorage.getItem('pulsar_usuario');
    const usuario: UsuarioDto | null = raw ? JSON.parse(raw) : null;
    return { token, usuario };
  } catch {
    return { token: null, usuario: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = carregarDoStorage();
  const [token, setToken] = useState<string | null>(stored.token);
  const [usuario, setUsuario] = useState<UsuarioDto | null>(stored.usuario);

  const salvarSessao = useCallback((res: LoginResponseDto) => {
    localStorage.setItem('pulsar_token', res.token);
    localStorage.setItem('pulsar_usuario', JSON.stringify(res.usuario));
    setToken(res.token);
    setUsuario(res.usuario);
  }, []);

  const login = useCallback(async (dto: LoginRequestDto) => {
    const { data } = await api.post<LoginResponseDto>('/auth/login', dto);
    salvarSessao(data);
    track.login('email');
  }, [salvarSessao]);

  const loginGoogle = useCallback(async (idToken: string) => {
    const { data } = await api.post<LoginResponseDto>('/auth/google', { idToken });
    salvarSessao(data);
    track.login('google');
  }, [salvarSessao]);

  const cadastrar = useCallback(async (dto: CadastroRequestDto) => {
    const { data } = await api.post<LoginResponseDto>('/auth/cadastro', dto);
    salvarSessao(data);
    track.cadastrou('email');
  }, [salvarSessao]);

  const atualizarPerfil = useCallback(async (dto: AtualizarPerfilRequestDto) => {
    if (!usuario) throw new Error('Nenhum usuário autenticado.');
    const { data } = await api.put<LoginResponseDto>(`/usuarios/${usuario.id}`, dto);
    salvarSessao(data);
  }, [usuario, salvarSessao]);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('pulsar_token');
    localStorage.removeItem('pulsar_usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        login,
        loginGoogle,
        cadastrar,
        atualizarPerfil,
        logout,
        estaAutenticado: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
