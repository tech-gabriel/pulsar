import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }));
vi.mock('../../hooks/useDestinoPosAuth', () => ({ useDestinoPosAuth: () => '/app' }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../features/ativacao/useInstalacao', () => ({ retomadaNoIPhone: () => false }));
vi.mock('../../components/auth/SocialAuthButtons', () => ({ default: () => null }));

import LoginPage from '../../pages/LoginPage';

const abrir = (url: string) => render(<MemoryRouter initialEntries={[url]}><LoginPage /></MemoryRouter>);

describe('LoginPage: sessão encerrada (SEC2, opção A)', () => {
  it('com ?sessao=encerrada, o cabeçalho explica e tranquiliza', () => {
    abrir('/login?sessao=encerrada');
    expect(screen.getByRole('heading', { name: 'Sua sessão terminou' })).toBeInTheDocument();
    expect(screen.getByText('Por segurança, entre de novo para continuar. Seus lugares e alertas continuam salvos.')).toBeInTheDocument();
  });

  it('sem o parâmetro, o login fica como era', () => {
    abrir('/login');
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });
});
