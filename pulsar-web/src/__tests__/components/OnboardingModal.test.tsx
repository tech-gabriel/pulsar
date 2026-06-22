import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingModal from '../../components/onboarding/OnboardingModal';

describe('OnboardingModal', () => {
  it('começa no passo de boas-vindas', () => {
    render(<OnboardingModal onConcluir={() => {}} />);
    expect(screen.getByText('Bem-vindo ao Pulsar')).toBeInTheDocument();
  });

  it('avança pelos passos com Próximo e conclui no último', async () => {
    const user = userEvent.setup();
    const onConcluir = vi.fn();
    render(<OnboardingModal onConcluir={onConcluir} />);

    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Entenda o mapa')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Como usar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Começar a usar' }));
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('volta com Anterior', async () => {
    const user = userEvent.setup();
    render(<OnboardingModal onConcluir={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Bem-vindo ao Pulsar')).toBeInTheDocument();
  });

  it('pular (X) conclui', async () => {
    const user = userEvent.setup();
    const onConcluir = vi.fn();
    render(<OnboardingModal onConcluir={onConcluir} />);
    await user.click(screen.getByRole('button', { name: 'Pular boas-vindas' }));
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });
});
