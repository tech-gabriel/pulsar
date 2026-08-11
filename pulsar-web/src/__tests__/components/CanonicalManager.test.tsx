import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { MemoryRouter } from 'react-router-dom';
import CanonicalManager from '../../components/CanonicalManager';

function montarEm(rota: string) {
  return render(
    <UnheadProvider head={createHead()}>
      <MemoryRouter initialEntries={[rota]}>
        <CanonicalManager />
      </MemoryRouter>
    </UnheadProvider>,
  );
}

const canonical = () => document.head.querySelector('link[rel="canonical"]');
const ogUrl = () => document.head.querySelector('meta[property="og:url"]');

describe('CanonicalManager', () => {
  it('dá canonical própria às rotas servidas pelo shell, que herdavam a da home', async () => {
    montarEm('/login');
    await waitFor(() =>
      expect(canonical()).toHaveAttribute('href', 'https://app-pulsar.com.br/login'),
    );
    expect(ogUrl()).toHaveAttribute('content', 'https://app-pulsar.com.br/login');
  });

  it('mantém a barra final só na home, como o template já fazia', async () => {
    montarEm('/');
    await waitFor(() => expect(canonical()).toHaveAttribute('href', 'https://app-pulsar.com.br/'));
  });

  it('normaliza a barra final das demais rotas para não duplicar URL', async () => {
    montarEm('/cadastro/');
    await waitFor(() =>
      expect(canonical()).toHaveAttribute('href', 'https://app-pulsar.com.br/cadastro'),
    );
  });

  it('ignora query e hash, que não mudam a página canônica', async () => {
    montarEm('/redefinir-senha?token=abc#topo');
    await waitFor(() =>
      expect(canonical()).toHaveAttribute('href', 'https://app-pulsar.com.br/redefinir-senha'),
    );
  });

  it('acompanha rotas profundas do app', async () => {
    montarEm('/app/historico/12');
    await waitFor(() =>
      expect(canonical()).toHaveAttribute('href', 'https://app-pulsar.com.br/app/historico/12'),
    );
  });
});
