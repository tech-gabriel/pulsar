import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { ThemeProvider } from '../../hooks/ThemeProvider';
import PrivacidadePage from '../../pages/PrivacidadePage';

describe('PrivacidadePage', () => {
  it('menciona o uso de analytics (PostHog) e transferência internacional', () => {
    render(
      <UnheadProvider head={createHead()}>
        <ThemeProvider>
          <MemoryRouter>
            <PrivacidadePage />
          </MemoryRouter>
        </ThemeProvider>
      </UnheadProvider>,
    );
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Estados Unidos/i)).toBeInTheDocument();
  });
});
