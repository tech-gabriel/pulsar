import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import TitleManager from '../../components/TitleManager';

function renderEm(pathname: string, state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <TitleManager />
    </MemoryRouter>,
  );
}

describe('TitleManager', () => {
  it('define o título da rota exata', () => {
    renderEm('/configuracoes');
    expect(document.title).toBe('Configurações · Pulsar');
  });

  it('usa "Mapa" na home', () => {
    renderEm('/');
    expect(document.title).toBe('Mapa · Pulsar');
  });

  it('rotas de admin levam o sufixo Admin', () => {
    renderEm('/admin/usuarios');
    expect(document.title).toBe('Usuários · Admin · Pulsar');
  });

  it('detalhe de histórico usa o nome da subprefeitura vindo no state', () => {
    renderEm('/historico/qualquer-id', { subNome: 'Sé' });
    expect(document.title).toBe('Histórico de Sé · Pulsar');
  });

  it('detalhe de histórico sem state cai no genérico', () => {
    renderEm('/historico/qualquer-id');
    expect(document.title).toBe('Histórico · Pulsar');
  });

  it('rota desconhecida usa o título institucional', () => {
    renderEm('/rota-inexistente');
    expect(document.title).toBe('Pulsar — Monitoramento Climático em Tempo Real');
  });
});
