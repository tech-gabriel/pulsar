import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';

const authState = { estaAutenticado: false, usuario: null as unknown };
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return { ...actual, useAuth: () => authState };
});
vi.mock('../../pages/MapaPage', () => ({ default: () => <div>MAPA_APP</div> }));

import { routes } from '../../routes';

function renderBaixada() {
  const router = createMemoryRouter(routes, { initialEntries: ['/baixada-santista'] });
  render(<UnheadProvider head={createHead()}><RouterProvider router={router} /></UnheadProvider>);
}

async function escolherPelaBusca(termo: string, nome: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('combobox'), termo);
  await user.click(within(screen.getByRole('listbox')).getByRole('button', { name: nome }));
}

describe('BaixadaPage', () => {
  beforeEach(() => { authState.estaAutenticado = false; });

  it('abre em Santos com os números reais', () => {
    renderBaixada();
    expect(screen.getByRole('heading', { level: 1, name: 'Vai alagar na sua cidade?' })).toBeInTheDocument();
    expect(screen.getByText('129')).toBeInTheDocument();
    expect(screen.getByText('trechos que costumam alagar, de 397 no mapa da cidade')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Receber alertas de Santos/ })).toHaveAttribute('href', '/cadastro');
    expect(screen.getByRole('link', { name: /Ver a cidade/ })).toHaveAttribute('href', '/risco-de-alagamento/santos');
  });

  it('busca leva ao município', async () => {
    renderBaixada();
    await escolherPelaBusca('guaruja', 'Guarujá');
    expect(screen.getByText('Guarujá', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Receber alertas do Guarujá/ })).toBeInTheDocument();
  });

  it('município sem pontos mostra 0 e o texto de até agora', async () => {
    renderBaixada();
    await escolherPelaBusca('bertioga', 'Bertioga');
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('pontos onde já alagou marcados até agora')).toBeInTheDocument();
  });

  it('cidade que não existe mostra a dica', async () => {
    renderBaixada();
    await userEvent.setup().type(screen.getByRole('combobox'), 'ubatuba');
    expect(screen.getByText('Não achamos essa cidade. A Baixada tem 9: tente Santos, Guarujá ou Praia Grande.')).toBeInTheDocument();
  });

  it('seletor marca a Baixada', () => {
    renderBaixada();
    expect(screen.getByRole('link', { name: 'Baixada Santista' })).toHaveAttribute('aria-current', 'page');
  });

  it('quem está logado vai para o app', async () => {
    authState.estaAutenticado = true;
    renderBaixada();
    expect(await screen.findByText('MAPA_APP')).toBeInTheDocument();
  });
});
