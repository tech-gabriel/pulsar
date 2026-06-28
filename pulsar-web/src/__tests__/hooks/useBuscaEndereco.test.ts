import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EnderecoBusca } from '../../types';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

import api from '../../api/client';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const resultados: EnderecoBusca[] = [
  { nome: 'Av. Paulista', descricao: 'Av. Paulista, São Paulo', tipo: 'address', latitude: -23.561, longitude: -46.656 },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockedApi.get.mockResolvedValue({ data: resultados });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBuscaEndereco', () => {
  it('não chama a API para termos com menos de 3 caracteres', async () => {
    const { result } = renderHook(() => useBuscaEndereco());
    act(() => result.current.setTermo('ab'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.resultados).toEqual([]);
  });

  it('busca endereços após o debounce e popula os resultados', async () => {
    const { result } = renderHook(() => useBuscaEndereco());
    act(() => result.current.setTermo('paulista'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/busca/enderecos', { params: { q: 'paulista' } });
    expect(result.current.resultados).toEqual(resultados);
    expect(result.current.carregando).toBe(false);
  });

  it('faz debounce: digitação rápida gera uma única chamada', async () => {
    const { result } = renderHook(() => useBuscaEndereco());
    act(() => result.current.setTermo('pau'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    act(() => result.current.setTermo('paulista'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/busca/enderecos', { params: { q: 'paulista' } });
  });

  it('expõe erro quando a API falha', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useBuscaEndereco());
    act(() => result.current.setTermo('paulista'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.erro).toBeTruthy();
    expect(result.current.resultados).toEqual([]);
  });

  it('limpar reseta termo e resultados', async () => {
    const { result } = renderHook(() => useBuscaEndereco());
    act(() => result.current.setTermo('paulista'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    act(() => result.current.limpar());
    expect(result.current.termo).toBe('');
    expect(result.current.resultados).toEqual([]);
  });
});
