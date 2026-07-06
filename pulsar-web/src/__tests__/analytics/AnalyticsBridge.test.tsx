import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { UsuarioDto } from '../../types';
import { AuthContext } from '../../contexts/AuthContext';

const h = vi.hoisted(() => ({
  identifyUser: vi.fn(),
  resetAnalytics: vi.fn(),
}));
vi.mock('../../analytics/identify', () => ({
  identifyUser: h.identifyUser,
  resetAnalytics: h.resetAnalytics,
}));
// usePageviews precisa de router; neutraliza aqui (testado em separado).
vi.mock('../../analytics/usePageviews', () => ({ usePageviews: () => {} }));

import AnalyticsBridge from '../../analytics/AnalyticsBridge';

const usuario: UsuarioDto = {
  id: 'u-1', nome: 'Ana', email: 'ana@example.com', perfil: 'CIDADAO', role: 'USUARIO',
};

// Valor mínimo do contexto; só `usuario` importa para este componente.
function ctx(usuarioAtual: UsuarioDto | null) {
  return {
    usuario: usuarioAtual,
    token: usuarioAtual ? 't' : null,
    estaAutenticado: !!usuarioAtual,
    login: vi.fn(), loginGoogle: vi.fn(), cadastrar: vi.fn(),
    atualizarPerfil: vi.fn(), logout: vi.fn(),
  };
}

describe('AnalyticsBridge', () => {
  beforeEach(() => {
    h.identifyUser.mockClear();
    h.resetAnalytics.mockClear();
  });

  it('identifica quando há usuário', () => {
    render(
      <AuthContext.Provider value={ctx(usuario)}>
        <AnalyticsBridge />
      </AuthContext.Provider>,
    );
    expect(h.identifyUser).toHaveBeenCalledWith(usuario);
  });

  it('reseta ao passar de logado para deslogado', () => {
    const { rerender } = render(
      <AuthContext.Provider value={ctx(usuario)}>
        <AnalyticsBridge />
      </AuthContext.Provider>,
    );
    h.identifyUser.mockClear();
    rerender(
      <AuthContext.Provider value={ctx(null)}>
        <AnalyticsBridge />
      </AuthContext.Provider>,
    );
    expect(h.resetAnalytics).toHaveBeenCalled();
  });
});
