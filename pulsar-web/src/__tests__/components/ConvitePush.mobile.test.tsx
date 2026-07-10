import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConvitePush from '../../components/notificacoes/ConvitePush';

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: {} }) }));
vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado: 'inativo', ocupado: false, ativar: vi.fn() }),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe('ConvitePush (mobile)', () => {
  it('renderiza como barra compacta acima da tab bar', () => {
    const { container } = render(<ConvitePush />);
    expect(screen.getByText(/receba alertas no celular/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ativar/i })).toBeInTheDocument();
    const barra = container.querySelector('[data-variante="mobile-bar"]');
    expect(barra).toBeTruthy();
  });
});
