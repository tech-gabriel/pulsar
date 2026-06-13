import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RoleAcesso, UsuarioAdminDto, UsuarioDto } from '../../types';

// Header depende de tema/auth/router; stub para isolar a página.
vi.mock('../../components/ui/Header', () => ({ default: () => null }));

const authState: { usuario: UsuarioDto | null } = { usuario: null };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const hookState = {
  usuarios: [] as UsuarioAdminDto[],
  carregando: false,
  erro: false,
  alterarRole: vi.fn(),
  alterarAtivo: vi.fn(),
  recarregar: vi.fn(),
};
vi.mock('../../hooks/useUsuariosAdmin', () => ({
  useUsuariosAdmin: () => hookState,
}));

import UsuariosAdminPage from '../../pages/admin/UsuariosAdminPage';

const usuarioDto = (role: RoleAcesso): UsuarioDto => ({
  id: 'me', nome: 'Eu', email: 'eu@test.com', perfil: 'CIDADAO', role,
});

const linha = (over: Partial<UsuarioAdminDto> = {}): UsuarioAdminDto => ({
  id: 'u2', nome: 'Bob', email: 'bob@test.com', perfil: 'CIDADAO',
  role: 'USUARIO', ativo: true, criadoEm: '2026-06-01T00:00:00Z', ...over,
});

beforeEach(() => {
  hookState.usuarios = [linha({ id: 'me', nome: 'Eu', email: 'eu@test.com', role: 'ADMIN' }), linha()];
});

describe('UsuariosAdminPage', () => {
  it('SUPORTE vê em modo somente leitura, sem controles de edição', () => {
    authState.usuario = usuarioDto('SUPORTE');
    render(<MemoryRouter><UsuariosAdminPage /></MemoryRouter>);

    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Nenhum <select> de role é renderizado para SUPORTE.
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });

  it('ADMIN vê o seletor de role para outros usuários', () => {
    authState.usuario = usuarioDto('ADMIN');
    render(<MemoryRouter><UsuariosAdminPage /></MemoryRouter>);

    expect(screen.queryByText('Somente leitura')).not.toBeInTheDocument();
    // O usuário "Bob" (outro) é editável → há ao menos um seletor de role.
    expect(screen.getByRole('combobox', { name: /role de bob/i })).toBeInTheDocument();
  });
});
