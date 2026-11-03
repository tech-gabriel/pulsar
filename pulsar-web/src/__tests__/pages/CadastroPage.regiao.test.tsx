import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lerRegiaoPendente } from '../../features/ativacao/regiaoPendente';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ cadastrar: vi.fn() }) }));
vi.mock('../../hooks/useDestinoPosAuth', () => ({ useDestinoPosAuth: () => '/app' }));
vi.mock('../../components/auth/SocialAuthButtons', () => ({ default: () => null }));
vi.mock('../../components/auth/AuthLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));

import CadastroPage from '../../pages/CadastroPage';

const abrir = (url: string) => render(<MemoryRouter initialEntries={[url]}><CadastroPage /></MemoryRouter>);

describe('CadastroPage com ?regiao=', () => {
  beforeEach(() => localStorage.clear());

  it('guarda a subprefeitura da página pública para o onboarding', () => {
    abrir('/cadastro?regiao=mooca');
    expect(lerRegiaoPendente()).toBe('mooca');
  });

  it('zona não vira pré-seleção', () => {
    abrir('/cadastro?regiao=zona-leste');
    expect(lerRegiaoPendente()).toBeNull();
  });
});
