import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppFooter from '../../components/ui/AppFooter';
import { APP_VERSION } from '../../data/changelog';

function renderFooter() {
  render(
    <MemoryRouter>
      <AppFooter />
    </MemoryRouter>,
  );
}

describe('AppFooter', () => {
  it('mostra o selo de versão apontando para /novidades', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: new RegExp(`v${APP_VERSION}`) })).toHaveAttribute('href', '/novidades');
  });

  it('tem link "Novidades" e Instagram seguro', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Novidades' })).toHaveAttribute('href', '/novidades');
    const ig = screen.getByRole('link', { name: /instagram/i });
    expect(ig).toHaveAttribute('href', 'https://instagram.com/appulsar');
    expect(ig).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
