import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const instalouApp = vi.hoisted(() => vi.fn());
vi.mock('../../../analytics', () => ({ track: { instalouApp } }));

import { capturarPromptDeInstalacao, useInstalacao } from '../../../features/ativacao/useInstalacao';

function disparaPrompt(outcome: 'accepted' | 'dismissed') {
  const ev = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  ev.prompt = vi.fn(() => Promise.resolve());
  ev.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(ev);
  return ev;
}

describe('useInstalacao', () => {
  it('sem prompt guardado e sem iOS: indisponível', () => {
    const { result } = renderHook(() => useInstalacao());
    expect(result.current.instalacao).toBe('indisponivel');
  });

  it('guarda o prompt disparado cedo e instala quando a pessoa aceita', async () => {
    capturarPromptDeInstalacao();
    const { result } = renderHook(() => useInstalacao());
    let ev!: ReturnType<typeof disparaPrompt>;
    act(() => { ev = disparaPrompt('accepted'); });
    expect(result.current.instalacao).toBe('prompt');

    let ok = false;
    await act(async () => { ok = await result.current.instalar(); });

    expect(ev.prompt).toHaveBeenCalled();
    expect(ok).toBe(true);
    expect(instalouApp).toHaveBeenCalledWith('desktop');
    expect(result.current.instalacao).toBe('indisponivel');
  });

  it('recusado: devolve false', async () => {
    capturarPromptDeInstalacao();
    const { result } = renderHook(() => useInstalacao());
    act(() => { disparaPrompt('dismissed'); });
    let ok = true;
    await act(async () => { ok = await result.current.instalar(); });
    expect(ok).toBe(false);
  });
});
