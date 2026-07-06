import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FavoritoDto } from '../../types';

// Mock do toast: capturamos as chamadas para validar feedback ao usuário.
const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

// Mock do cliente HTTP.
vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

// Mock do analytics: capturamos as chamadas para validar o evento de favoritar.
const analyticsMock = vi.hoisted(() => ({ favoritouRegiao: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { favoritouRegiao: analyticsMock.favoritouRegiao } }));

import api from '../../api/client';
import { useFavoritos } from '../../hooks/useFavoritos';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const USUARIO = 'user-1';
const fav = (regiaoId: string, regiaoNome = 'Centro'): FavoritoDto => ({ regiaoId, regiaoNome });

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: [] });
  mockedApi.post.mockResolvedValue({ data: fav('r1') });
  mockedApi.delete.mockResolvedValue({ data: {} });
});

describe('useFavoritos', () => {
  it('não busca favoritos quando usuarioId é null', async () => {
    const { result } = renderHook(() => useFavoritos(null));
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.favoritos).toEqual([]);
  });

  it('carrega os favoritos do usuário ao montar', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [fav('r1'), fav('r2', 'Norte')] });
    const { result } = renderHook(() => useFavoritos(USUARIO));

    await waitFor(() => expect(result.current.favoritos).toHaveLength(2));
    expect(mockedApi.get).toHaveBeenCalledWith(`/usuarios/${USUARIO}/favoritos`);
    expect(result.current.isFavorito('r1')).toBe(true);
    expect(result.current.isFavorito('r2')).toBe(true);
    expect(result.current.isFavorito('r3')).toBe(false);
  });

  it('mantém favoritos atuais se a carga inicial falhar', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('rede'));
    const { result } = renderHook(() => useFavoritos(USUARIO));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.favoritos).toEqual([]);
  });

  it('adiciona aos favoritos quando a região ainda não é favorita', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: fav('r9', 'Sul') });
    const { result } = renderHook(() => useFavoritos(USUARIO));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.toggleFavorito('r9'); });

    expect(mockedApi.post).toHaveBeenCalledWith(`/usuarios/${USUARIO}/favoritos`, { regiaoId: 'r9' });
    expect(result.current.isFavorito('r9')).toBe(true);
    expect(showToast).toHaveBeenCalledWith('Região adicionada aos favoritos', 'success');
  });

  it('emite favoritou_regiao ao adicionar um favorito', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: fav('r9', 'Sul') });
    const { result } = renderHook(() => useFavoritos(USUARIO));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.toggleFavorito('r9'); });

    expect(analyticsMock.favoritouRegiao).toHaveBeenCalledWith('r9');
  });

  it('remove dos favoritos quando a região já é favorita', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [fav('r1')] });
    const { result } = renderHook(() => useFavoritos(USUARIO));
    await waitFor(() => expect(result.current.isFavorito('r1')).toBe(true));

    await act(async () => { await result.current.toggleFavorito('r1'); });

    expect(mockedApi.delete).toHaveBeenCalledWith(`/usuarios/${USUARIO}/favoritos/r1`);
    expect(result.current.isFavorito('r1')).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Região removida dos favoritos', 'info');
  });

  it('exibe toast de erro quando o toggle falha', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('falha'));
    const { result } = renderHook(() => useFavoritos(USUARIO));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.toggleFavorito('r9'); });

    expect(showToast).toHaveBeenCalledWith('Não foi possível atualizar favoritos', 'error');
    expect(result.current.isFavorito('r9')).toBe(false);
  });

  it('não faz nada ao alternar favorito sem usuário', async () => {
    const { result } = renderHook(() => useFavoritos(null));
    await act(async () => { await result.current.toggleFavorito('r1'); });

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });
});
