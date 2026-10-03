import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OnboardingModal from '../../components/onboarding/OnboardingModal';
import LandingFaq from '../../components/landing/LandingFaq';
import LandingFeatures from '../../components/landing/LandingFeatures';

// Desde a 1.11.0 o que se favorita é a subprefeitura: nenhum texto pode mandar
// favoritar "região" (o app não faz mais isso).
const PROIBIDO = /favorit\w*\s+(as\s+|suas\s+)?regi(ão|ões)|regi(ão|ões)\s+favorit/i;

describe('copy de favoritos fala em subprefeitura', () => {
  it('onboarding: passo "Como usar"', () => {
    const { container, getByText } = render(<OnboardingModal onConcluir={vi.fn()} />);
    fireEvent.click(getByText('Próximo'));
    fireEvent.click(getByText('Próximo'));
    expect(container.textContent).not.toMatch(PROIBIDO);
    expect(container.textContent).toMatch(/subprefeituras que você acompanha/i);
  });

  it('landing: FAQ e recursos', () => {
    const { container } = render(<MemoryRouter><LandingFaq /><LandingFeatures /></MemoryRouter>);
    expect(container.innerHTML).not.toMatch(PROIBIDO);
  });
});
