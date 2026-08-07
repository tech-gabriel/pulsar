import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OcorrenciaAlagamentoDto } from '../../types';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../../api/client';
import { useOcorrenciasAlagamento } from '../../hooks/useOcorrenciasAlagamento';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const pontos: OcorrenciaAlagamentoDto[] = [
  { id: '1', tipo: 'ALAGAMENTO', dataOcorrencia: '2026-04-01T00:00:00Z', latitude: -23.6, longitude: -46.5, nmSubprefeitura: 'VP - VILA PRUDENTE' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: pontos });
});

describe('useOcorrenciasAlagamento', () => {
  it('nao busca enquanto inativo', () => {
    renderHook(() => useOcorrenciasAlagamento(false));
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('busca ao ativar e expoe os pontos', async () => {
    const { result } = renderHook(() => useOcorrenciasAlagamento(true));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledWith('/ocorrencias/alagamento');
    expect(result.current.ocorrencias).toHaveLength(1);
    expect(result.current.erro).toBeNull();
  });

  it('nao re-busca em re-render apos carregar', async () => {
    const { result, rerender } = renderHook(({ a }) => useOcorrenciasAlagamento(a), {
      initialProps: { a: true },
    });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    rerender({ a: false });
    rerender({ a: true });
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('seta erro quando a busca falha', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('rede'));
    const { result } = renderHook(() => useOcorrenciasAlagamento(true));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).not.toBeNull();
  });
});
