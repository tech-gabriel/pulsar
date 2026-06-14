import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MetricasDto, SistemaStatusDto, UsuarioDto } from '../../types';

vi.mock('../../components/ui/Header', () => ({ default: () => null }));

const authState: { usuario: UsuarioDto | null } = { usuario: null };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const hookState = {
  status: null as SistemaStatusDto | null,
  metricas: null as MetricasDto | null,
  carregando: false,
  erro: false,
  coletando: false,
  forcarColeta: vi.fn(),
  recarregar: vi.fn(),
};
vi.mock('../../hooks/useSistemaAdmin', () => ({
  useSistemaAdmin: () => hookState,
}));

import SistemaAdminPage from '../../pages/admin/SistemaAdminPage';

const usuarioDto = (role: UsuarioDto['role']): UsuarioDto => ({
  id: 'me', nome: 'Eu', email: 'eu@test.com', perfil: 'CIDADAO', role,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/sistema']}>
      <SistemaAdminPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  hookState.status = {
    subprefeiturasAtivas: 32, subprefeiturasComLeitura: 32, ultimaColeta: '2026-06-13T00:00:00Z',
    leiturasUltimas24h: 100, intervaloColetaMinutos: 15,
    subprefeituras: [{ nome: 'Sé', ultimaLeitura: '2026-06-13T00:00:00Z' }],
  };
  hookState.metricas = {
    totalUsuarios: 3, usuariosAtivos: 3, admins: 1, suportes: 1,
    totalSugestoes: 45, sugestoesAtivas: 45, alertasUltimas24h: 2, leiturasUltimas24h: 100,
  };
});

describe('SistemaAdminPage', () => {
  it('SUPORTE vê o painel sem o botão de forçar coleta', () => {
    authState.usuario = usuarioDto('SUPORTE');
    renderPage();

    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.getByText('Sé')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /forçar coleta/i })).not.toBeInTheDocument();
  });

  it('ADMIN vê o botão de forçar coleta', () => {
    authState.usuario = usuarioDto('ADMIN');
    renderPage();

    expect(screen.queryByText('Somente leitura')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forçar coleta/i })).toBeInTheDocument();
  });
});
