import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SugestaoAdminDto, UsuarioDto } from '../../types';

vi.mock('../../components/ui/Header', () => ({ default: () => null }));

const authState: { usuario: UsuarioDto | null } = { usuario: null };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const hookState = {
  sugestoes: [] as SugestaoAdminDto[],
  carregando: false,
  erro: false,
  criar: vi.fn(),
  atualizar: vi.fn(),
  remover: vi.fn(),
  recarregar: vi.fn(),
};
vi.mock('../../hooks/useSugestoesAdmin', () => ({
  useSugestoesAdmin: () => hookState,
}));

import SugestoesAdminPage from '../../pages/admin/SugestoesAdminPage';

const usuarioDto = (role: UsuarioDto['role']): UsuarioDto => ({
  id: 'me', nome: 'Eu', email: 'eu@test.com', perfil: 'CIDADAO', role,
});

const sugestao = (over: Partial<SugestaoAdminDto> = {}): SugestaoAdminDto => ({
  id: 's1', categoria: 'GERAL', faixaRisco: 'BAIXO', titulo: 'Mantenha-se informado',
  descricao: 'Acompanhe o Pulsar.', ativa: true, criadoEm: '2026-06-01T00:00:00Z',
  atualizadoEm: '2026-06-01T00:00:00Z', ...over,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/sugestoes']}>
      <SugestoesAdminPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  hookState.sugestoes = [sugestao()];
});

describe('SugestoesAdminPage', () => {
  it('SUPORTE vê em modo somente leitura, sem ações de edição', () => {
    authState.usuario = usuarioDto('SUPORTE');
    renderPage();

    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.getByText('Mantenha-se informado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nova sugestão/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar sugestão/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir sugestão/i })).not.toBeInTheDocument();
  });

  it('ADMIN vê o botão de nova sugestão e as ações por item', () => {
    authState.usuario = usuarioDto('ADMIN');
    renderPage();

    expect(screen.queryByText('Somente leitura')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova sugestão/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar sugestão/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir sugestão/i })).toBeInTheDocument();
  });
});
