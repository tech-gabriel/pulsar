import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
import api from '../../api/client';
import { useCatalogoDicas, _limparCacheDicas } from '../../hooks/useCatalogoDicas';

const get = (api as unknown as { get: ReturnType<typeof vi.fn> }).get;

beforeEach(() => { vi.clearAllMocks(); _limparCacheDicas(); });

describe('useCatalogoDicas', () => {
  it('busca uma vez e reaproveita entre componentes', async () => {
    get.mockResolvedValue({ data: [{ id: '1', categoria: 'CALOR', faixa: 'ALTO', titulo: 'T', descricao: 'D', ordem: 1 }] });
    const a = renderHook(() => useCatalogoDicas());
    await waitFor(() => expect(a.result.current).toHaveLength(1));
    const b = renderHook(() => useCatalogoDicas());
    await waitFor(() => expect(b.result.current).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/sugestoes');
  });

  it('falha devolve lista vazia e tenta de novo na próxima montagem', async () => {
    get.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce({ data: [] });
    const a = renderHook(() => useCatalogoDicas());
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(a.result.current).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    renderHook(() => useCatalogoDicas());
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
