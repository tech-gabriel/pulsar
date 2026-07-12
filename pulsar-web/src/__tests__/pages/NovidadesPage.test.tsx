import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { ThemeProvider } from '../../hooks/ThemeProvider';
import NovidadesPage from '../../pages/NovidadesPage';
import { CHANGELOG } from '../../data/changelog';

function renderPage() {
  render(
    <UnheadProvider head={createHead()}>
      <ThemeProvider>
        <MemoryRouter>
          <NovidadesPage />
        </MemoryRouter>
      </ThemeProvider>
    </UnheadProvider>,
  );
}

describe('NovidadesPage', () => {
  it('mostra o título e todos os releases do changelog', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Novidades/i, level: 1 })).toBeInTheDocument();
    // Cada release é um <h2> "vX.Y.Z" (o selo de versão do rodapé é um link,
    // não um heading, então não colide com estas asserts).
    for (const r of CHANGELOG) {
      expect(screen.getByRole('heading', { name: `v${r.versao}`, level: 2 })).toBeInTheDocument();
    }
  });

  it('tem a chamada do Instagram com link correto', () => {
    renderPage();
    // Nome específico do callout: o rodapé também tem um link de Instagram
    // (aria-label "Instagram do Pulsar"), então usamos o aria-label do card.
    const link = screen.getByRole('link', { name: 'Seguir o Pulsar no Instagram' });
    expect(link).toHaveAttribute('href', 'https://instagram.com/appulsar');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
