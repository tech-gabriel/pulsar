import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import api from '../api/client';
import type {
  CadastroRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  UsuarioDto,
} from '../types';

interface AuthContextValue {
  usuario: UsuarioDto | null;
  token: string | null;
  login: (dto: LoginRequestDto) => Promise<void>;
  cadastrar: (dto: CadastroRequestDto) => Promise<void>;
  logout: () => void;
  estaAutenticado: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
  }, [salvarSessao]);

  const cadastrar = useCallback(async (dto: CadastroRequestDto) => {
    const { data } = await api.post<LoginResponseDto>('/auth/cadastro', dto);
    salvarSessao(data);
  }, [salvarSessao]);

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
        cadastrar,
        logout,
        estaAutenticado: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
