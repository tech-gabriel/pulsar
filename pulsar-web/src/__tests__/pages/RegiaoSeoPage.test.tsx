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

  it('mantém o bloco de estatísticas oculto até haver histórico suficiente', () => {
    // Enquanto ESTATISTICAS_PRONTAS = false (falta rollup de histórico), os cards
    // de "dias de risco alto / chuva acumulada" não devem aparecer.
    renderRota('/risco-de-alagamento/zona-leste');
    expect(screen.queryByText(/dias de risco alto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chuva acumulada/i)).not.toBeInTheDocument();
  });

  it('cross-linka para as outras zonas', () => {
    renderRota('/risco-de-alagamento/zona-leste');
    expect(screen.getByRole('link', { name: /Zona Sul/ })).toHaveAttribute(
      'href', '/risco-de-alagamento/zona-sul',
    );
  });

  it('slug inválido renderiza estado de "não encontrada" sem quebrar', () => {
    renderRota('/risco-de-alagamento/zona-inexistente');
    expect(screen.getByText(/não encontrada/i)).toBeInTheDocument();
  });
});
