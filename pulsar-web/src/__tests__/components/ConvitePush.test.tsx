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

let chuva: { area: { id: string; nome: string }; quando: string; mm: number } | null = null;
vi.mock('../../hooks/useChuvaFortePrevista', () => ({ useChuvaFortePrevista: () => chuva }));

// Estes casos exercitam a variante desktop (card com "Agora não").
// A variante mobile (barra compacta) tem cobertura própria em ConvitePush.mobile.test.tsx.
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));

import ConvitePush from '../../components/notificacoes/ConvitePush';
import type { Area } from '../../features/cidade/areas';

const area = (id: string, nome: string, faixaRisco: Area['faixaRisco'] = 'BAIXO') =>
  ({ id, nome, zona: 'Oeste', faixaRisco, scoreAtual: null, ultimaLeitura: null }) as unknown as Area;
const tranquilas = [area('s1', 'Butantã'), area('s2', 'Campo Limpo')];
const TITULO = 'Alertas de Butantã e Campo Limpo';

describe('ConvitePush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado = 'inativo';
    ocupado = false;
    chuva = null;
    sessionStorage.clear();
  });

  it('dia comum: fala das favoritas pelo nome e promete silêncio', () => {
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.getByText(TITULO)).toBeInTheDocument();
    expect(screen.getByText(/uma das duas entrar em Atenção ou Alerta. Fora isso, silêncio./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar alertas' })).toBeInTheDocument();
  });

  it('favorita em risco: diz o motivo e pede "Me avise"', () => {
    render(<ConvitePush favoritas={[area('s1', 'Butantã'), area('s2', 'Campo Limpo', 'MODERADO')]} />);
    expect(screen.getByText('Atenção agora em Campo Limpo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Me avise' })).toBeInTheDocument();
  });

  it('chuva forte prevista numa favorita: diz quando e onde', () => {
    chuva = { area: { id: 's2', nome: 'Campo Limpo' }, quando: 'amanhã às 12h', mm: 14.3 };
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.getByText('Chuva forte amanhã às 12h em Campo Limpo')).toBeInTheDocument();
    expect(screen.getByText(/14,3 mm previstos/)).toBeInTheDocument();
  });

  it('não aparece quando o push já está ativo', () => {
    estado = 'ativo';
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument();
  });

  it('não aparece quando o push é indisponível neste dispositivo', () => {
    estado = 'indisponivel';
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument();
  });

  it('clicar em ativar chama push.ativar', async () => {
    const user = userEvent.setup();
    render(<ConvitePush favoritas={tranquilas} />);
    await user.click(screen.getByRole('button', { name: 'Ativar alertas' }));
    expect(ativar).toHaveBeenCalledTimes(1);
  });

  it('dispensar esconde o convite e marca a sessão', async () => {
    const user = userEvent.setup();
    render(<ConvitePush favoritas={tranquilas} />);
    await user.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('pulsar-push-convite-dispensado')).toBe('pessoal');
  });

  it('dispensado na sessão: o pessoal fica escondido, mas um motivo novo volta', () => {
    sessionStorage.setItem('pulsar-push-convite-dispensado', 'pessoal');
    const { unmount } = render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument();
    unmount();
    chuva = { area: { id: 's2', nome: 'Campo Limpo' }, quando: 'amanhã às 12h', mm: 14.3 };
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.getByRole('button', { name: 'Me avise' })).toBeInTheDocument();
  });

  it('o mesmo motivo dispensado não volta', () => {
    chuva = { area: { id: 's2', nome: 'Campo Limpo' }, quando: 'amanhã às 12h', mm: 14.3 };
    sessionStorage.setItem('pulsar-push-convite-dispensado', 'chuva:s2:amanhã às 12h');
    render(<ConvitePush favoritas={tranquilas} />);
    expect(screen.queryByRole('button', { name: 'Me avise' })).not.toBeInTheDocument();
  });
});
