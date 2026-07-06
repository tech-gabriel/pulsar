import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  capturarPageview: vi.fn(),
  track: { visitouLanding: vi.fn(), visitouApp: vi.fn() },
}));
vi.mock('../../analytics/events', () => ({
  capturarPageview: h.capturarPageview,
  track: h.track,
}));

import { usePageviews } from '../../analytics/usePageviews';

function Sonda() {
  usePageviews();
  return null;
}

describe('usePageviews', () => {
  beforeEach(() => {
    h.capturarPageview.mockClear();
    h.track.visitouLanding.mockClear();
    h.track.visitouApp.mockClear();
  });

  it('na landing emite pageview + visitou_landing', () => {
    render(<MemoryRouter initialEntries={['/']}><Sonda /></MemoryRouter>);
    expect(h.capturarPageview).toHaveBeenCalledWith('/');
    expect(h.track.visitouLanding).toHaveBeenCalledWith('/');
    expect(h.track.visitouApp).not.toHaveBeenCalled();
  });

  it('numa rota /app emite pageview + visitou_app', () => {
    render(<MemoryRouter initialEntries={['/app/configuracoes']}><Sonda /></MemoryRouter>);
    expect(h.capturarPageview).toHaveBeenCalledWith('/app/configuracoes');
    expect(h.track.visitouApp).toHaveBeenCalledWith('/app/configuracoes');
    expect(h.track.visitouLanding).not.toHaveBeenCalled();
  });
});
