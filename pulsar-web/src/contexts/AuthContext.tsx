import { createContext, useContext } from 'react';
import type {
  AtualizarPerfilRequestDto,
  CadastroRequestDto,
  LoginRequestDto,
  UsuarioDto,
} from '../types';
import type { MotivoSaida } from '../analytics';

export interface AuthContextValue {
  usuario: UsuarioDto | null;
  token: string | null;
  login: (dto: LoginRequestDto) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  cadastrar: (dto: CadastroRequestDto) => Promise<void>;
  atualizarPerfil: (dto: AtualizarPerfilRequestDto) => Promise<void>;
  recarregarUsuario: () => Promise<void>;
  reenviarConfirmacao: () => Promise<void>;
  sairDeTodosOsAparelhos: () => Promise<void>;
  /** C1: exclui a conta; no sucesso recarrega a landing com o aviso. Erro relança e mantém a sessão. */
  excluirConta: (confirmacao: string, motivo?: MotivoSaida) => Promise<void>;
  logout: () => void;
  estaAutenticado: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
