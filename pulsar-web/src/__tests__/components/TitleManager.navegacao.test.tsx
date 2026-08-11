import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import TitleManager from '../../components/TitleManager';
import { useSeoHead } from '../../hooks/useSeoHead';

const TITULO_DO_TEMPLATE = 'Pulsar · Monitoramento Climático em Tempo Real';

function PaginaPublica() {
  useSeoHead({ title: 'Pulsar · Termos de Uso', descricao: 'Termos.', path: '/termos' });
  return <Link to="/login">Entrar</Link>;
}

function montar() {
  // O index.html chega com o título institucional; é para ele que o unhead
  // volta quando a página pública desmonta, e era isso que apagava o título
  // definido pelo TitleManager.
  document.title = TITULO_DO_TEMPLATE;

  return render(
    <UnheadProvider head={createHead()}>
      <MemoryRouter initialEntries={['/termos']}>
        <TitleManager />
        <Routes>
          <Route path="/termos" element={<PaginaPublica />} />
          <Route path="/login" element={<p>formulário</p>} />
        </Routes>
      </MemoryRouter>
    </UnheadProvider>,
  );
}

describe('TitleManager ao navegar entre páginas com e sem SEO próprio', () => {
  beforeEach(() => {
    document.head.querySelectorAll('title, meta, link').forEach((el) => el.remove());
  });

  it('a página pública manda no título enquanto está montada', async () => {
    montar();
    await waitFor(() => expect(document.title).toBe('Pulsar · Termos de Uso'));
  });

  it('mantém o título da rota de destino depois que a página pública desmonta', async () => {
    montar();
    await waitFor(() => expect(document.title).toBe('Pulsar · Termos de Uso'));

    await userEvent.click(screen.getByRole('link', { name: 'Entrar' }));
    await screen.findByText('formulário');

    // Sem dono único do título, o unhead voltava ao título do template ao
    // desmontar a página pública e sobrescrevia o "Pulsar · Entrar".
    await waitFor(() => expect(document.title).toBe('Pulsar · Entrar'));
  });
});
