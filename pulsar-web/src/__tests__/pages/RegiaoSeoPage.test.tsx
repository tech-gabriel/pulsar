import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import RegiaoSeoPage from '../../pages/RegiaoSeoPage';

function renderRota(path: string) {
  return render(
    <UnheadProvider head={createHead()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/risco-de-alagamento/:zona" element={<RegiaoSeoPage />} />
        </Routes>
      </MemoryRouter>
    </UnheadProvider>,
  );
}

describe('RegiaoSeoPage', () => {
  it('renderiza H1, subprefeituras e CTA com deep-link da zona', async () => {
    renderRota('/risco-de-alagamento/zona-leste');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Zona Leste/);
    // subprefeitura da zona aparece
    expect(screen.getByText(/Mooca/)).toBeInTheDocument();
    // CTA leva ao cadastro com o slug
    const cta = screen.getByRole('link', { name: /ver risco ao vivo/i });
    expect(cta).toHaveAttribute('href', '/cadastro?regiao=zona-leste');
    // título de SEO aplicado
    await waitFor(() => expect(document.title).toContain('Zona Leste'));
  });

  it('cross-linka para as outras zonas', () => {
    renderRota('/risco-de-alagamento/zona-leste');
    expect(screen.getByRole('link', { name: /Zona Sul/ })).toHaveAttribute(
      'href', '/risco-de-alagamento/zona-sul',
    );
  });

  it('linka as subprefeituras da zona para as páginas próprias', () => {
    renderRota('/risco-de-alagamento/zona-leste');
    expect(screen.getByRole('link', { name: 'Itaquera' })).toHaveAttribute(
      'href', '/risco-de-alagamento/itaquera',
    );
  });

  it('renderiza a página da subprefeitura com distritos, ocorrências, CTA e vizinhas', async () => {
    renderRota('/risco-de-alagamento/mooca');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Risco de alagamento na Mooca');
    expect(screen.getByRole('heading', { name: 'Distritos da Mooca' })).toBeInTheDocument();
    expect(screen.getByText('Tatuapé')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alagamentos registrados na Mooca' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver risco ao vivo na Mooca/i })).toHaveAttribute(
      'href', '/cadastro?regiao=mooca',
    );
    // breadcrumb volta para a zona; vizinhas da mesma zona, sem a própria
    expect(screen.getByRole('link', { name: 'Zona Leste' })).toHaveAttribute('href', '/risco-de-alagamento/zona-leste');
    expect(screen.getByRole('link', { name: 'Itaquera' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Risco de alagamento na Mooca (Zona Leste, SP) · Pulsar'));
  });

  it('Sé, única da Zona Centro, cruza para as outras zonas', () => {
    renderRota('/risco-de-alagamento/se');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Risco de alagamento na Sé');
    expect(screen.getByRole('link', { name: 'Zona Sul' })).toBeInTheDocument();
  });

  it('slug inválido renderiza estado de "não encontrada" sem quebrar', () => {
    renderRota('/risco-de-alagamento/zona-inexistente');
    expect(screen.getByText(/não encontrada/i)).toBeInTheDocument();
  });
});
