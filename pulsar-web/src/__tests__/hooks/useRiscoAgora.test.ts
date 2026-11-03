import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRiscoAgora } from '../../hooks/useRiscoAgora';

const resposta = [{ nome: 'Mooca', faixaRisco: 'BAIXO', score: 12, atualizadoEmUtc: '2026-11-02T18:00:00Z', alagamentosCge: [] }];

function visibilidade(estado: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
}

describe('useRiscoAgora', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    visibilidade('visible');
    fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(resposta), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const esvaziar = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

  it('não busca enquanto inativo', async () => {
    renderHook(() => useRiscoAgora(false));
    await esvaziar();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('busca ao ativar e entrega os dados', async () => {
    const { result } = renderHook(() => useRiscoAgora(true));
    await esvaziar();
    expect(fetchMock).toHaveBeenCalledWith('/api/publico/risco-agora', expect.anything());
    expect(result.current.dados?.[0].nome).toBe('Mooca');
    expect(result.current.erro).toBe(false);
  });

  it('repete a cada 5 min com a aba visível e não repete com ela oculta', async () => {
    renderHook(() => useRiscoAgora(true));
    await esvaziar();
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    visibilidade('hidden');
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('erro de rede liga o erro e mantém os dados anteriores', async () => {
    const { result } = renderHook(() => useRiscoAgora(true));
    await esvaziar();
    fetchMock.mockRejectedValueOnce(new Error('rede'));
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000); });
    expect(result.current.erro).toBe(true);
    expect(result.current.dados?.[0].nome).toBe('Mooca');
  });

  it('resposta 429 conta como erro', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    const { result } = renderHook(() => useRiscoAgora(true));
    await esvaziar();
    expect(result.current.erro).toBe(true);
    expect(result.current.dados).toBeNull();
  });
});
