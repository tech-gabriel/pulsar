import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
import api from '../../api/client';
import { useResumoGrade } from '../../hooks/useResumoGrade';

const get = (api as unknown as { get: ReturnType<typeof vi.fn> }).get;

beforeEach(() => { vi.clearAllMocks(); });

describe('useResumoGrade', () => {
  it('busca a comparação do período no endpoint do admin', async () => {
    get.mockResolvedValue({ data: [{ subprefeitura: 'Mooca' }] });
    const { result } = renderHook(() => useResumoGrade(30));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(get).toHaveBeenCalledWith('/admin/grade/resumo', { params: { dias: 30 } });
    expect(result.current.linhas).toEqual([{ subprefeitura: 'Mooca' }]);
    expect(result.current.erro).toBe(false);
  });

  it('falha vira erro, sem linhas e sem ficar carregando', async () => {
    get.mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useResumoGrade(7));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBe(true);
    expect(result.current.linhas).toEqual([]);
  });
});
