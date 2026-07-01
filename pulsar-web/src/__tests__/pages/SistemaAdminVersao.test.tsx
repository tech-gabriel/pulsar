import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_VERSION } from '../../data/changelog';

// Header carrega ThemeProvider/AlertasProvider próprios, que não fazem parte
// deste teste (foco é só o chip de versão) — mockado como no teste irmão
// SistemaAdminPage.test.tsx.
vi.mock('../../components/ui/Header', () => ({ default: () => null }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: { role: 'ADMIN' } }),
}));

vi.mock('../../hooks/useSistemaAdmin', () => ({
  useSistemaAdmin: () => ({
    status: null,
    metricas: null,
    carregando: true,
    erro: null,
    coletando: false,
    forcarColeta: () => {},
    recarregar: () => {},
  }),
}));

import SistemaAdminPage from '../../pages/admin/SistemaAdminPage';

describe('SistemaAdminPage — versão', () => {
  it('mostra a versão do app no cabeçalho', () => {
    render(
      <MemoryRouter>
        <SistemaAdminPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });
});
