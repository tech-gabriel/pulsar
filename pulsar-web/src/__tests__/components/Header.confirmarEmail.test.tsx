import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ usuario: { id: 'u1', nome: 'Ana', role: 'USUARIO', emailVerificado: false as boolean | undefined } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: h.usuario, logout: vi.fn() }) }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: [], carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: [], carregando: false }) }));

import Header from '../../components/ui/Header';

describe('Header: lembrete de e-mail na aba Configurações (SEC1, opção D)', () => {
  it('e-mail não confirmado: ponto nas duas abas de Configurações, sem card flutuante', () => {
    h.usuario.emailVerificado = false;
    render(<MemoryRouter><Header /></MemoryRouter>);
    // Desktop e tab bar do celular: os dois links levam o aviso para leitor de tela.
    expect(screen.getAllByRole('link', { name: /Configurações.*e-mail não confirmado|Config\..*e-mail não confirmado/ })).toHaveLength(2);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('e-mail confirmado ou sessão antiga sem o campo: sem ponto', () => {
    for (const valor of [true, undefined]) {
      h.usuario.emailVerificado = valor;
      const { unmount } = render(<MemoryRouter><Header /></MemoryRouter>);
      expect(screen.queryByText('e-mail não confirmado')).toBeNull();
      unmount();
    }
  });
});
