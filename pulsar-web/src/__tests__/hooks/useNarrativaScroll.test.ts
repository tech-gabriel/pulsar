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
    // Espiona a factory do mock: precisa provar que o import foi *tentado e
    // rejeitado*, não só que nada aconteceu (o que passaria com um hook vazio).
    const fabricaDoMockGsap = vi.fn(() => {
      throw new Error('falha ao carregar o gsap');
    });
    vi.doMock('gsap', fabricaDoMockGsap);
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    // Filho [data-cena] presente para distinguir este cenário do caso
    // degenerado: sem a rejeição do import, o callback do mm.add chegaria
    // até aqui e teria cenas pra marcar.
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
      expect(fabricaDoMockGsap).toHaveBeenCalled();
    });
    expect(el.dataset.animada).toBeUndefined();

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

  it('monta a timeline sem buracos entre as cenas e com uma parada final antes do pin soltar', async () => {
    type Chamada = {
      metodo: 'fromTo' | 'to';
      alvo: unknown;
      vars: { duration?: number };
      posicao: unknown;
    };
    const chamadas: Chamada[] = [];

    const add = vi.fn((_query: string, callback: () => void | (() => void)) => {
      callback();
    });

    vi.doMock('gsap', () => ({
      gsap: {
        registerPlugin: vi.fn(),
        matchMedia: vi.fn(() => ({ add, revert: vi.fn() })),
        timeline: vi.fn(() => {
          const tween = {
            fromTo: vi.fn((alvo: unknown, _de: unknown, vars: Chamada['vars'], posicao: unknown) => {
              chamadas.push({ metodo: 'fromTo', alvo, vars, posicao });
              return tween;
            }),
            to: vi.fn((alvo: unknown, vars: Chamada['vars'], posicao: unknown) => {
              chamadas.push({ metodo: 'to', alvo, vars, posicao });
              return tween;
            }),
          };
          return tween;
        }),
      },
    }));
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    const cenas = ['acender', 'risco', 'score', 'alagamento', 'alerta'].map((id) => {
      const cena = document.createElement('article');
      cena.dataset.cena = id;
      el.appendChild(cena);
      return cena;
    });
    document.body.appendChild(el);

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    await waitFor(() => {
      expect(el.dataset.animada).toBe('true');
    });

    // 5 cenas: 4 entradas (fromTo), 4 saídas (to num elemento de cena) e 1
    // parada final (to num alvo vazio, sem posição própria) = 9 chamadas.
    expect(chamadas).toHaveLength(9);

    const entradas = chamadas.filter((c) => c.metodo === 'fromTo');
    const saidas = chamadas.filter((c) => c.metodo === 'to' && cenas.includes(c.alvo as HTMLElement));
    const parada = chamadas[chamadas.length - 1];

    // Toda entrada começa exatamente onde a tween anterior termina: '>' sem
    // offset. É essa consistência que fecha as janelas do scroll sem
    // nenhuma cena visível (achado da review).
    expect(entradas).toHaveLength(4);
    expect(entradas.every((c) => c.posicao === '>')).toBe(true);

    // Toda saída espera a mesma pausa (0.6s) depois da entrada terminar.
    expect(saidas).toHaveLength(4);
    expect(saidas.every((c) => c.posicao === '>0.6')).toBe(true);

    // A última chamada é a parada final (alvo vazio, não uma cena), com a
    // mesma duração da pausa (0.6s) que as outras 4 cenas tinham antes de
    // sumir — é o que dá à cena 5 tempo de tela antes do pin soltar.
    expect(parada.metodo).toBe('to');
    expect(cenas).not.toContain(parada.alvo);
    expect(parada.vars.duration).toBe(0.6);

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
