import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ clicouInstagram: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { clicouInstagram: h.clicouInstagram } }));

import SobreCard from '../../components/ui/SobreCard';
import { APP_VERSION } from '../../data/changelog';

function renderSobre() {
  render(
    <MemoryRouter>
      <SobreCard />
    </MemoryRouter>,
  );
}

describe('SobreCard', () => {
  beforeEach(() => h.clicouInstagram.mockClear());

  it('tem um título "Sobre"', () => {
    renderSobre();
    expect(screen.getByRole('heading', { name: 'Sobre' })).toBeInTheDocument();
  });

  it('leva às Novidades', () => {
    renderSobre();
    expect(screen.getByRole('link', { name: /novidades/i })).toHaveAttribute('href', '/novidades');
  });

  it('tem link do Instagram seguro', () => {
    renderSobre();
    const ig = screen.getByRole('link', { name: /instagram/i });
    expect(ig).toHaveAttribute('href', 'https://instagram.com/appulsar');
    expect(ig).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(ig).toHaveAttribute('target', '_blank');
  });

  it('mostra a versão atual apontando para /novidades', () => {
    renderSobre();
    expect(
      screen.getByRole('link', { name: new RegExp(`v${APP_VERSION}`) }),
    ).toHaveAttribute('href', '/novidades');
  });

  it('emite clicou_instagram ao clicar no link do Instagram', async () => {
    renderSobre();
    const link = screen.getByRole('link', { name: /instagram/i });
    await userEvent.click(link);
    expect(h.clicouInstagram).toHaveBeenCalledWith('sobre');
  });
});
