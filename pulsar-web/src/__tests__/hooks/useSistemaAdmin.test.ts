import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ColetaResultadoDto, MetricasDto, SistemaStatusDto } from '../../types';

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from '../../api/client';
import { useSistemaAdmin } from '../../hooks/useSistemaAdmin';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const status: SistemaStatusDto = {
  subprefeiturasAtivas: 32,
  subprefeiturasComLeitura: 30,
  ultimaColeta: '2026-06-13T00:00:00Z',
  leiturasUltimas24h: 120,
  intervaloColetaMinutos: 15,
  subprefeituras: [{ nome: 'Sé', ultimaLeitura: '2026-06-13T00:00:00Z' }],
};

const metricas: MetricasDto = {
  totalUsuarios: 3, usuariosAtivos: 3, admins: 1, suportes: 1,
  totalSugestoes: 45, sugestoesAtivas: 45, alertasUltimas24h: 2, leiturasUltimas24h: 120,
};

const coleta: ColetaResultadoDto = {
  subprefeiturasProcessadas: 32, scoresCalculados: 32, alertasGerados: 2, concluidoEm: '2026-06-13T01:00:00Z',
};

function mockGets() {
  mockedApi.get.mockImplementation((url: string) =>
    Promise.resolve({ data: url.includes('metricas') ? metricas : status })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGets();
  mockedApi.post.mockResolvedValue({ data: coleta });
});

describe('useSistemaAdmin', () => {
  it('carrega status e métricas ao montar', async () => {
    const { result } = renderHook(() => useSistemaAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/sistema/status');
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/metricas');
    expect(result.current.status?.subprefeiturasAtivas).toBe(32);
    expect(result.current.metricas?.totalUsuarios).toBe(3);
  });

  it('marca erro quando a carga falha', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('rede'));
    const { result } = renderHook(() => useSistemaAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBe(true);
  });

  it('forçarColeta dispara POST com timeout estendido e notifica', async () => {
    const { result } = renderHook(() => useSistemaAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.forcarColeta(); });

    expect(mockedApi.post).toHaveBeenCalledWith('/admin/sistema/coletar', null, { timeout: 90000 });
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Coleta concluída'), 'success');
  });
});
