import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Auth mutável: alterna entre visitante deslogado e usuário autenticado.
const authState = { estaAutenticado: false, usuario: null as unknown };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

// O alvo de redirect (/app) é o mapa, que depende de Leaflet — stub leve.
vi.mock('../../pages/MapaPage', () => ({ default: () => <div>MAPA_APP</div> }));

import App from '../../App';

function renderApp(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
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

  it('usuário autenticado é redirecionado de / para /app', () => {
    authState.estaAutenticado = true;
    renderApp('/');

    expect(screen.getByText('MAPA_APP')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Acessar o Pulsar/i })).not.toBeInTheDocument();
  });
});
