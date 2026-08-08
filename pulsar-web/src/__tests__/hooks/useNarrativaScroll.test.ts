import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';

/**
 * O hook importa `gsap`/`gsap/ScrollTrigger` dinamicamente dentro do
 * `useEffect`, então cada teste que precisa controlar o comportamento do
 * GSAP usa `vi.doMock` + `vi.resetModules()` + `import()` dinâmico do hook,
 * em vez de `vi.mock` hoisted: assim o mock vale só para aquele teste, sem
 * vazar para os outros.
 *
 * A invariante coberta é sempre a mesma: `data-animada` nunca fica setado
 * sem uma timeline do GSAP por cima dele.
 */
describe('useNarrativaScroll', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.doUnmock('gsap');
    vi.doUnmock('gsap/ScrollTrigger');
    vi.unstubAllGlobals();
  });

  it('não quebra quando o elemento não existe', async () => {
    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      useNarrativaScroll(ref);
      return ref;
    });

    expect(result.current.current).toBeNull();
  });

  it('mantém data-animada indefinido se o import do gsap for rejeitado', async () => {
    vi.doMock('gsap', () => {
      throw new Error('falha ao carregar o gsap');
    });
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    document.body.appendChild(el);

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    await waitFor(() => {
      expect(el.dataset.animada).toBeUndefined();
    });

    el.remove();
  });

  it('em prefers-reduced-motion, nunca chega a importar o gsap', async () => {
    const fabricaDoMockGsap = vi.fn();
    vi.doMock('gsap', () => {
      fabricaDoMockGsap();
      return {
        gsap: {
          registerPlugin: vi.fn(),
          matchMedia: vi.fn(() => ({ add: vi.fn(), revert: vi.fn() })),
          timeline: vi.fn(),
        },
      };
    });
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    document.body.appendChild(el);

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    // Dá espaço para uma microtask indevida rodar antes de afirmar que o
    // import nunca foi tentado (o bail-out é síncrono, mas queremos garantir
    // que nada assíncrono dispara o import depois).
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fabricaDoMockGsap).not.toHaveBeenCalled();
    expect(el.dataset.animada).toBeUndefined();

    el.remove();
  });

  it('marca data-animada quando as condições batem, e desfaz no unmount', async () => {
    let limparCallback: (() => void) | undefined;
    const revert = vi.fn(() => limparCallback?.());
    const add = vi.fn((_query: string, callback: () => void | (() => void)) => {
      limparCallback = callback() ?? undefined;
    });

    vi.doMock('gsap', () => ({
      gsap: {
        registerPlugin: vi.fn(),
        matchMedia: vi.fn(() => ({ add, revert })),
        timeline: vi.fn(() => {
          const tween = {
            fromTo: vi.fn(() => tween),
            to: vi.fn(() => tween),
          };
          return tween;
        }),
      },
    }));
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    const cena = document.createElement('article');
    cena.dataset.cena = 'acender';
    el.appendChild(cena);
    document.body.appendChild(el);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    await waitFor(() => {
      expect(el.dataset.animada).toBe('true');
    });

    unmount();

    await waitFor(() => {
      expect(el.dataset.animada).toBeUndefined();
    });
    expect(revert).toHaveBeenCalled();

    el.remove();
  });

  it('regressão: desfaz data-animada se algo lançar depois dele já ter sido setado', async () => {
    // Reproduz o bug original: o callback do mm.add já rodou
    // `el.dataset.animada = 'true'` quando `gsap.timeline` lança. Sem a
    // correção (limpar atribuído só depois do mm.add, catch sem cleanup
    // explícito), a página ficava presa no meio do caminho: container em
    // `min-height: 100vh`, cenas em `position: absolute` e as cenas 2-5 em
    // `opacity: 0` do CSS, sem timeline por cima para revelá-las.
    const revert = vi.fn();
    const add = vi.fn((_query: string, callback: () => void | (() => void)) => {
      callback();
    });

    vi.doMock('gsap', () => ({
      gsap: {
        registerPlugin: vi.fn(),
        matchMedia: vi.fn(() => ({ add, revert })),
        timeline: vi.fn(() => {
          throw new Error('falha ao montar a timeline');
        }),
      },
    }));
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    const cena = document.createElement('article');
    cena.dataset.cena = 'acender';
    el.appendChild(cena);
    document.body.appendChild(el);

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    await waitFor(() => {
      expect(el.dataset.animada).toBeUndefined();
    });
    // `limpar` já estava atribuído antes do `mm.add`, então o catch consegue
    // chamar `mm.revert()` mesmo com o throw acontecendo dentro do callback.
    expect(revert).toHaveBeenCalled();

    el.remove();
  });
});
