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
  it('define o título da rota exata (marca primeiro)', () => {
    renderEm('/configuracoes');
    expect(document.title).toBe('Pulsar · Configurações');
  });

  it('home usa o título institucional', () => {
    renderEm('/');
    expect(document.title).toBe('Pulsar — Monitoramento Climático em Tempo Real');
  });

  it('rotas de admin levam o sufixo Admin', () => {
    renderEm('/admin/usuarios');
    expect(document.title).toBe('Pulsar · Usuários · Admin');
  });

  it('detalhe de histórico usa o nome da subprefeitura vindo no state', () => {
    renderEm('/historico/qualquer-id', { subNome: 'Sé' });
    expect(document.title).toBe('Pulsar · Histórico de Sé');
  });

  it('detalhe de histórico sem state cai no genérico', () => {
    renderEm('/historico/qualquer-id');
    expect(document.title).toBe('Pulsar · Histórico');
  });

  it('rota desconhecida usa o título institucional', () => {
    renderEm('/rota-inexistente');
    expect(document.title).toBe('Pulsar — Monitoramento Climático em Tempo Real');
  });
});
