import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OnboardingModal from '../../components/onboarding/OnboardingModal';

describe('OnboardingModal — copy', () => {
  it('não usa travessão em nenhum passo', () => {
    const { container, getByText } = render(<OnboardingModal onConcluir={vi.fn()} />);
    // passo 1
    expect(container.textContent).not.toContain('—');
    // avança até o passo do mapa (onde ficava o outro travessão)
    getByText('Próximo').click();
    expect(container.textContent).not.toContain('—');
  });
});
