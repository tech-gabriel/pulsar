import { createContext, useContext } from 'react';
import type {
  AtualizarPerfilRequestDto,
  CadastroRequestDto,
  LoginRequestDto,
  UsuarioDto,
} from '../types';

export interface AuthContextValue {
  usuario: UsuarioDto | null;
  token: string | null;
  login: (dto: LoginRequestDto) => Promise<void>;
  cadastrar: (dto: CadastroRequestDto) => Promise<void>;
  atualizarPerfil: (dto: AtualizarPerfilRequestDto) => Promise<void>;
  logout: () => void;
  estaAutenticado: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
