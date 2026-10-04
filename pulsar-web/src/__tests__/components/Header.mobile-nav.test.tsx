import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Header from '../../components/ui/Header';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: { nome: 'Adm', role: 'ADMIN' }, logout: vi.fn() }),
}));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: [], carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [], carregando: false }) }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));

function setup() {
  return render(<MemoryRouter><Header /></MemoryRouter>);
}

describe('Header — navegação mobile e acesso admin', () => {
  it('a tab bar inferior NÃO inclui a aba Admin', () => {
    const { container } = setup();
    const tabbar = container.querySelector('.tabbar-mobile') as HTMLElement;
    expect(tabbar).toBeTruthy();
    expect(within(tabbar).queryByText('Admin')).toBeNull();
    // 5 abas fixas (Mapa/Hist/Dash/News/Config)
    expect(tabbar.querySelectorAll('a').length).toBe(5);
  });

  it('admin tem link para o painel admin no top bar', () => {
    setup();
    const link = screen.getByRole('link', { name: /admin/i });
    expect(link).toHaveAttribute('href', '/app/admin/usuarios');
  });
});
