import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const track = vi.hoisted(() => ({ passoVisto: vi.fn(), passoPulado: vi.fn() }));
vi.mock('../../../analytics', () => ({ track }));

import { useAtivacao } from '../../../features/ativacao/useAtivacao';
import type { ContextoAtivacao } from '../../../features/ativacao/passos';

const novo: ContextoAtivacao = { favoritas: 0, push: 'inativo', instalacao: 'prompt' };

describe('useAtivacao', () => {
  it('espera o contexto e fixa o roteiro', () => {
    const { result, rerender } = renderHook(({ ctx }) => useAtivacao(ctx), { initialProps: { ctx: null as ContextoAtivacao | null } });
    expect(result.current.passos).toBeNull();
    rerender({ ctx: novo });
    expect(result.current.passos).toEqual(['promessa', 'escolher', 'instalar', 'alerta', 'pronto']);
    expect(result.current.passo).toBe('promessa');
    expect(track.passoVisto).toHaveBeenCalledWith('promessa', 1, 5);
  });

  it('o roteiro não encolhe quando as favoritas são salvas no meio', () => {
    const { result, rerender } = renderHook(({ ctx }) => useAtivacao(ctx), { initialProps: { ctx: novo } });
    act(() => result.current.avancar());
    rerender({ ctx: { ...novo, favoritas: 2 } });
    act(() => result.current.avancar());
    expect(result.current.passos).toHaveLength(5);
    expect(result.current.passo).toBe('instalar');
  });

  it('voltar e avançar mudam a direção; não passa das pontas', () => {
    const { result } = renderHook(() => useAtivacao(novo));
    act(() => result.current.voltar());
    expect(result.current.indice).toBe(0);
    act(() => result.current.avancar());
    expect(result.current.direcao).toBe(1);
    act(() => result.current.voltar());
    expect(result.current.direcao).toBe(-1);
    expect(result.current.passo).toBe('promessa');
  });

  it('pularPasso registra e avança; irPara vai direto', () => {
    const { result } = renderHook(() => useAtivacao(novo));
    act(() => result.current.avancar());
    act(() => result.current.pularPasso());
    expect(track.passoPulado).toHaveBeenCalledWith('escolher');
    expect(result.current.passo).toBe('instalar');
    act(() => result.current.irPara('pronto'));
    expect(result.current.passo).toBe('pronto');
  });
});
