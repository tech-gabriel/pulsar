import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { describe, it, expect } from 'vitest';
import TitleManager from '../../components/TitleManager';

// O título passa pelo @unhead (e não por `document.title` direto) para ter um
// dono só; por isso o provider aqui e a espera assíncrona nas asserções.
function renderEm(pathname: string, state?: unknown) {
  render(
    <UnheadProvider head={createHead()}>
      <MemoryRouter initialEntries={[{ pathname, state }]}>
        <TitleManager />
      </MemoryRouter>
    </UnheadProvider>,
  );
}

const esperarTitulo = (esperado: string) =>
  waitFor(() => expect(document.title).toBe(esperado));

describe('TitleManager', () => {
  it('define o título da rota exata (marca primeiro)', async () => {
    renderEm('/app/configuracoes');
    await esperarTitulo('Pulsar · Configurações');
  });

  it('home usa o título institucional', async () => {
    renderEm('/');
    await esperarTitulo('Pulsar · Monitoramento Climático em Tempo Real');
  });

  it('rotas de admin levam o sufixo Admin', async () => {
    renderEm('/app/admin/usuarios');
    await esperarTitulo('Pulsar · Usuários · Admin');
  });

  it('detalhe de histórico usa o nome da subprefeitura vindo no state', async () => {
    renderEm('/app/historico/qualquer-id', { subNome: 'Sé' });
    await esperarTitulo('Pulsar · Histórico de Sé');
  });

  it('detalhe de histórico sem state cai no genérico', async () => {
    renderEm('/app/historico/qualquer-id');
    await esperarTitulo('Pulsar · Histórico');
  });

  it('rota desconhecida usa o título institucional', async () => {
    renderEm('/rota-inexistente');
    await esperarTitulo('Pulsar · Monitoramento Climático em Tempo Real');
  });
});
