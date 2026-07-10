import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EstadoPush } from '../../hooks/usePushSubscription';

// --- Mocks dos hooks/contextos de que o convite depende ---
const ativar = vi.fn();
const showToast = vi.fn();
let estado: EstadoPush = 'inativo';
let ocupado = false;

vi.mock('../../hooks/useNotificacoesPrefs', () => ({
  useNotificacoesPrefs: () => ({
    prefs: { alertaModerado: false, alertaAlto: true, resumoDiario: false },
    toggle: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ estado, ocupado, ativar, desativar: vi.fn() }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

// Estes casos exercitam a variante desktop (card com "Agora não").
// A variante mobile (barra compacta) tem cobertura própria em ConvitePush.mobile.test.tsx.
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));

import ConvitePush from '../../components/notificacoes/ConvitePush';

describe('ConvitePush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado = 'inativo';
    ocupado = false;
    sessionStorage.clear();
  });

  it('mostra o convite quando o push está inativo', () => {
    render(<ConvitePush />);
    expect(screen.getByText('Receba alertas no celular')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeInTheDocument();
  });

  it('não aparece quando o push já está ativo', () => {
    estado = 'ativo';
    render(<ConvitePush />);
    expect(screen.queryByText('Receba alertas no celular')).not.toBeInTheDocument();
  });

  it('não aparece quando o push é indisponível neste dispositivo', () => {
    estado = 'indisponivel';
    render(<ConvitePush />);
    expect(screen.queryByText('Receba alertas no celular')).not.toBeInTheDocument();
  });

  it('clicar em Ativar chama push.ativar', async () => {
    const user = userEvent.setup();
    render(<ConvitePush />);
    await user.click(screen.getByRole('button', { name: 'Ativar' }));
    expect(ativar).toHaveBeenCalledTimes(1);
  });

  it('dispensar esconde o convite e marca a sessão', async () => {
    const user = userEvent.setup();
    render(<ConvitePush />);
    await user.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText('Receba alertas no celular')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('pulsar-push-convite-dispensado')).toBe('1');
  });

  it('permanece escondido se já foi dispensado na sessão', () => {
    sessionStorage.setItem('pulsar-push-convite-dispensado', '1');
    render(<ConvitePush />);
    expect(screen.queryByText('Receba alertas no celular')).not.toBeInTheDocument();
  });
});
