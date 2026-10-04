import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingFaq from '../../components/landing/LandingFaq';
import LandingFeatures from '../../components/landing/LandingFeatures';

// Desde a 1.11.0 o que se favorita é a subprefeitura: nenhum texto pode mandar
// favoritar "região" (o app não faz mais isso).
const PROIBIDO = /favorit\w*\s+(as\s+|suas\s+)?regi(ão|ões)|regi(ão|ões)\s+favorit/i;

describe('copy de favoritos fala em subprefeitura', () => {
  it('landing: FAQ e recursos', () => {
    const { container } = render(<MemoryRouter><LandingFaq /><LandingFeatures /></MemoryRouter>);
    expect(container.innerHTML).not.toMatch(PROIBIDO);
  });
});
