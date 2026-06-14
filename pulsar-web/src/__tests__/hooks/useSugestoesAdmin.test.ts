import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SugestaoAdminDto } from '../../types';

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '../../api/client';
import { useSugestoesAdmin } from '../../hooks/useSugestoesAdmin';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sugestao = (over: Partial<SugestaoAdminDto> = {}): SugestaoAdminDto => ({
  id: 's1',
  categoria: 'GERAL',
  faixaRisco: 'BAIXO',
  titulo: 'Título',
  descricao: 'Descrição',
  ativa: true,
  criadoEm: '2026-06-01T00:00:00Z',
  atualizadoEm: '2026-06-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: [sugestao()] });
  mockedApi.post.mockResolvedValue({ data: sugestao({ id: 's2' }) });
  mockedApi.put.mockResolvedValue({ data: sugestao() });
  mockedApi.delete.mockResolvedValue({ data: {} });
});

describe('useSugestoesAdmin', () => {
  it('carrega o catálogo ao montar', async () => {
    const { result } = renderHook(() => useSugestoesAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/sugestoes');
    expect(result.current.sugestoes).toHaveLength(1);
  });

  it('criar adiciona ao topo e retorna true', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sugestao({ id: 's2', titulo: 'Nova' }) });
    const { result } = renderHook(() => useSugestoesAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.criar({ categoria: 'GERAL', faixaRisco: 'BAIXO', titulo: 'Nova', descricao: 'D', ativa: true });
    });

    expect(ok).toBe(true);
    expect(result.current.sugestoes[0].id).toBe('s2');
    expect(showToast).toHaveBeenCalledWith('Sugestão criada', 'success');
  });

  it('remover exclui da lista', async () => {
    const { result } = renderHook(() => useSugestoesAdmin());
    await waitFor(() => expect(result.current.sugestoes).toHaveLength(1));

    await act(async () => { await result.current.remover('s1'); });

    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/sugestoes/s1');
    expect(result.current.sugestoes).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith('Sugestão excluída', 'info');
  });

  it('exibe a mensagem do backend quando a exclusão falha (vinculada a alertas)', async () => {
    mockedApi.delete.mockRejectedValueOnce({ response: { data: { mensagem: 'Esta sugestão está vinculada a alertas e não pode ser excluída. Desative-a em vez de excluir.' } } });
    const { result } = renderHook(() => useSugestoesAdmin());
    await waitFor(() => expect(result.current.sugestoes).toHaveLength(1));

    await act(async () => { await result.current.remover('s1'); });

    expect(showToast).toHaveBeenCalledWith(
      'Esta sugestão está vinculada a alertas e não pode ser excluída. Desative-a em vez de excluir.',
      'error'
    );
    // A sugestão permanece na lista.
    expect(result.current.sugestoes).toHaveLength(1);
  });
});
