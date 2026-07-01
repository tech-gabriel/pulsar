import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeloVersao from '../../components/SeloVersao';
import { APP_VERSION } from '../../data/changelog';

describe('SeloVersao', () => {
  it('mostra a versão atual e linka para /novidades', () => {
    render(
      <MemoryRouter>
        <SeloVersao />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: new RegExp(`v${APP_VERSION}`) });
    expect(link).toHaveAttribute('href', '/novidades');
  });
});
