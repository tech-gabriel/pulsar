import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { ThemeProvider } from '../../hooks/ThemeProvider';

const h = vi.hoisted(() => ({ viuNovidades: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { viuNovidades: h.viuNovidades } }));

import NovidadesPage from '../../pages/NovidadesPage';
import { APP_VERSION } from '../../data/changelog';

describe('NovidadesPage analytics', () => {
  beforeEach(() => h.viuNovidades.mockClear());

  it('emite viu_novidades com a versão ao montar', () => {
    render(
      <UnheadProvider head={createHead()}>
        <ThemeProvider>
          <MemoryRouter>
            <NovidadesPage />
          </MemoryRouter>
        </ThemeProvider>
      </UnheadProvider>,
    );
    expect(h.viuNovidades).toHaveBeenCalledWith(APP_VERSION);
  });
});
