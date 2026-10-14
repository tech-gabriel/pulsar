import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  usuario: {
    id: 'u1', nome: 'Ana', email: 'ana@x.com', perfil: 'CIDADAO', role: 'USUARIO',
    emailVerificado: true, emailPendente: 'nova@x.com' as string | null,
  },
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: h.usuario, logout: vi.fn(), atualizarPerfil: vi.fn() }),
}));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../components/ui/SobreCard', () => ({ default: () => null }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({
  useNotificacoesPrefs: () => ({ prefs: { alertaAlto: true, alertaModerado: false, resumoDiario: false }, toggle: vi.fn() }),
}));
vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado: 'inativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }),
}));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [], toggleFavorito: vi.fn() }) }));

import ConfiguracoesPage from '../../pages/ConfiguracoesPage';

describe('ConfiguracoesPage e-mail pendente', () => {
  it('mostra o e-mail pendente e o atual', () => {
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.getByText('Enviamos um link para nova@x.com. Até você confirmar, o e-mail da conta continua sendo ana@x.com.')).toBeInTheDocument();
  });

  it('sem pendente não mostra o aviso', () => {
    h.usuario.emailPendente = null;
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.queryByText(/Enviamos um link para/)).toBeNull();
  });
});
