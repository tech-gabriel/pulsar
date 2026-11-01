import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConvitePush from '../../components/notificacoes/ConvitePush';
import type { Area } from '../../features/cidade/areas';

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: {} }) }));
vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado: 'inativo', ocupado: false, ativar: vi.fn() }),
}));
vi.mock('../../hooks/useChuvaFortePrevista', () => ({ useChuvaFortePrevista: () => null }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe('ConvitePush (mobile)', () => {
  it('barra de duas linhas acima da tab bar: o título e o porquê', () => {
    const favoritas = [{ id: 's1', nome: 'Butantã', zona: 'Oeste', faixaRisco: 'BAIXO' }] as unknown as Area[];
    const { container } = render(<ConvitePush favoritas={favoritas} />);
    expect(screen.getByText('Alertas de Butantã')).toBeInTheDocument();
    expect(screen.getByText('Só quando ela entrar em risco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ativar/i })).toBeInTheDocument();
    const barra = container.querySelector('[data-variante="mobile-bar"]');
    expect(barra).toBeTruthy();
  });
});
