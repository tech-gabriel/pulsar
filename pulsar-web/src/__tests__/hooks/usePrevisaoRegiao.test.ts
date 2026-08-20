import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FaixaPrevisaoDto } from '../../types';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../../api/client';
import { usePrevisaoRegiao } from '../../hooks/usePrevisaoRegiao';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

// Payload igual ao que a produção serializa, com o Z nos dois instantes: o Npgsql
// devolve Kind=Utc e o System.Text.Json escreve o sufixo. Sem ele o JavaScript leria
// as strings como hora local, deslocando tudo em 3h em São Paulo.
const faixas: FaixaPrevisaoDto[] = [
  {
    instantePrevisto: '2026-08-17T18:00:00Z',
    chuvaMm: 12.4,
    probabilidadeChuva: 0.82,
    ventoKmH: 21,
    rajadaKmH: null,
    temperaturaC: 19.5,
    condicaoCodigo: 502,
    condicaoDescricao: 'chuva forte',
    coletadoEm: '2026-08-17T12:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: faixas });
});

describe('usePrevisaoRegiao', () => {
  it('nao busca sem regiao selecionada', () => {
    const { result } = renderHook(() => usePrevisaoRegiao(null));
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.faixas).toEqual([]);
  });

  it('busca a rota da previsao da regiao e expoe as faixas', async () => {
    const { result } = renderHook(() => usePrevisaoRegiao('r1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(mockedApi.get).toHaveBeenCalledWith('/regioes/r1/previsao');
    expect(result.current.faixas).toEqual(faixas);
    expect(result.current.erro).toBeNull();
  });

  it('trata lista vazia como resposta legitima, e nao como erro', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => usePrevisaoRegiao('r1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.faixas).toEqual([]);
    expect(result.current.erro).toBeNull();
  });

  it('expoe erro quando a requisicao falha', async () => {
    mockedApi.get.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => usePrevisaoRegiao('r1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe('Não foi possível carregar a previsão.');
    expect(result.current.faixas).toEqual([]);
  });

  it('limpa a previsao anterior ao trocar de regiao', async () => {
    let resolver: ((v: { data: FaixaPrevisaoDto[] }) => void) | undefined;
    const { result, rerender } = renderHook(({ id }) => usePrevisaoRegiao(id), {
      initialProps: { id: 'r1' },
    });
    await waitFor(() => expect(result.current.faixas).toHaveLength(1));

    // Segunda região com resposta pendurada: sem a limpeza, a previsão da região
    // anterior continuaria na tela enquanto esta carrega.
    mockedApi.get.mockReturnValue(new Promise((r) => { resolver = r; }));
    rerender({ id: 'r2' });

    expect(result.current.faixas).toEqual([]);
    resolver?.({ data: faixas });
  });

  it('ignora a resposta da regiao anterior que chega atrasada', async () => {
    // É para isto que serve a flag `cancelado` do cleanup: sem ela, a resposta lenta
    // da região que o usuário já deixou sobrescreve a previsão da região atual.
    const antiga: FaixaPrevisaoDto[] = [{ ...faixas[0], chuvaMm: 99 }];
    let resolverAntiga: ((v: { data: FaixaPrevisaoDto[] }) => void) | undefined;
    mockedApi.get.mockReturnValueOnce(new Promise((r) => { resolverAntiga = r; }));

    const { result, rerender } = renderHook(({ id }) => usePrevisaoRegiao(id), {
      initialProps: { id: 'r1' },
    });
    rerender({ id: 'r2' });
    await waitFor(() => expect(result.current.faixas).toEqual(faixas));

    // O act espera a continuação do await do hook rodar. Sem isso a asserção
    // correria antes da resposta atrasada chegar e passaria por acidente.
    await act(async () => {
      resolverAntiga?.({ data: antiga });
    });
    expect(result.current.faixas).toEqual(faixas);
  });

  it('ignora o erro da regiao anterior que chega atrasado', async () => {
    // Mesma flag, o outro lado: a falha da região abandonada não pode esconder a
    // previsão da região que o usuário está olhando agora.
    let rejeitarAntiga: ((e: Error) => void) | undefined;
    mockedApi.get.mockReturnValueOnce(new Promise((_, rej) => { rejeitarAntiga = rej; }));

    const { result, rerender } = renderHook(({ id }) => usePrevisaoRegiao(id), {
      initialProps: { id: 'r1' },
    });
    rerender({ id: 'r2' });
    await waitFor(() => expect(result.current.faixas).toEqual(faixas));

    await act(async () => {
      rejeitarAntiga?.(new Error('500'));
    });
    expect(result.current.erro).toBeNull();
    expect(result.current.faixas).toEqual(faixas);
  });

  it('busca de novo quando a regiao muda', async () => {
    const { result, rerender } = renderHook(({ id }) => usePrevisaoRegiao(id), {
      initialProps: { id: 'r1' },
    });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    rerender({ id: 'r2' });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/regioes/r1/previsao');
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/regioes/r2/previsao');
  });
});
