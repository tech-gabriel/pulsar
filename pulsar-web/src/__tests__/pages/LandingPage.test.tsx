import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

// Auth mutável: alterna entre visitante deslogado e usuário autenticado.
// Mantém o `AuthContext` real (importOriginal) porque o AuthProvider de
// verdade é renderizado via RootLayout/routes e precisa dele para montar o
// Provider; só o hook `useAuth` é substituído para controlar o estado no teste.
const authState = { estaAutenticado: false, usuario: null as unknown };
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => authState,
  };
});

// O alvo de redirect (/app) é o mapa, que depende de Leaflet — stub leve.
vi.mock('../../pages/MapaPage', () => ({ default: () => <div>MAPA_APP</div> }));

import { routes } from '../../routes';

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('LandingPage / RotaLanding', () => {
  beforeEach(() => {
    authState.estaAutenticado = false;
    authState.usuario = null;
  });

  it('visitante deslogado vê a landing com os CTAs', () => {
    renderApp('/');

    const acessar = screen.getByRole('link', { name: /Acessar o Pulsar/i });
    expect(acessar).toHaveAttribute('href', '/login');

    // "Criar conta" aparece no nav e no hero — todos apontam para /cadastro.
    const criarConta = screen.getAllByRole('link', { name: /Criar conta/i });
    expect(criarConta.length).toBeGreaterThan(0);
    criarConta.forEach((l) => expect(l).toHaveAttribute('href', '/cadastro'));

    expect(screen.queryByText('MAPA_APP')).not.toBeInTheDocument();
  });

  it('usuário autenticado é redirecionado de / para /app', async () => {
    authState.estaAutenticado = true;
    renderApp('/');

    // A rota /app é `lazy` (import dinâmico) — precisa esperar resolver.
    expect(await screen.findByText('MAPA_APP')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Acessar o Pulsar/i })).not.toBeInTheDocument();
  });
});
