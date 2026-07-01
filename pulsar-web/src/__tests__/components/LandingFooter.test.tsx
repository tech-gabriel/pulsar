import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingFooter from '../../components/landing/LandingFooter';
import { APP_VERSION } from '../../data/changelog';

function renderFooter() {
  render(
    <MemoryRouter>
      <LandingFooter />
    </MemoryRouter>,
  );
}

describe('LandingFooter', () => {
  it('tem link para Novidades', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Novidades' })).toHaveAttribute('href', '/novidades');
  });

  it('mostra o selo de versão apontando para /novidades', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: new RegExp(`v${APP_VERSION}`) })).toHaveAttribute('href', '/novidades');
  });

  it('tem link do Instagram com rel seguro', () => {
    renderFooter();
    const ig = screen.getByRole('link', { name: /instagram/i });
    expect(ig).toHaveAttribute('href', 'https://instagram.com/appulsar');
    expect(ig).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
