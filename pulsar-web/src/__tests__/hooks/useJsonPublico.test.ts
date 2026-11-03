import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useJsonPublico } from '../../hooks/useJsonPublico';

describe('useJsonPublico', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('só baixa quando ativo e baixa uma vez', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response('{"a":1}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(({ ativo }) => useJsonPublico<{ a: number }>('/x.json', ativo), { initialProps: { ativo: false } });
    expect(fetchMock).not.toHaveBeenCalled();
    rerender({ ativo: true });
    await waitFor(() => expect(result.current.dados).toEqual({ a: 1 }));
    rerender({ ativo: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha liga o erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const { result } = renderHook(() => useJsonPublico('/x.json', true));
    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.dados).toBeNull();
  });
});
