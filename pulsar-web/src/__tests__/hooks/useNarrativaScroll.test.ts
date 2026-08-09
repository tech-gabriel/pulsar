import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';

/**
 * Substitui `document.fonts` por uma promise que o teste controla e devolve a
 * função que restaura o valor original. `delete` não serve: a propriedade é
 * readonly no lib.dom, e o `tsc -b` do build reprova (TS2704).
 */
function stubDeFontes(ready: Promise<void>) {
  const original = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  return () => {
    if (original) Object.defineProperty(document, 'fonts', original);
    else Reflect.deleteProperty(document, 'fonts');
  };
}

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

  it('remede o pin quando as fontes ficam prontas, sem depender do evento load', async () => {
    // Regressão: isso já foi um listener de `load`, que é inerte aqui. Quando
    // o import dinâmico do GSAP resolve (e em qualquer navegação SPA para a
    // landing), `load` já disparou, então o refresh nunca acontecia e o pin
    // ficava medido contra a métrica de fonte errada.
    const refresh = vi.fn();
    const registerPlugin = vi.fn();
    let liberarFontes: () => void = () => {};
    const fontesProntas = new Promise<void>((resolve) => {
      liberarFontes = resolve;
    });
    const restaurarFontes = stubDeFontes(fontesProntas);

    const adicionarListener = vi.spyOn(window, 'addEventListener');

    vi.doMock('gsap', () => ({
      gsap: {
        registerPlugin,
        matchMedia: vi.fn(() => ({ add: vi.fn(), revert: vi.fn() })),
      },
    }));
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    document.body.appendChild(el);

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    // `registerPlugin` prova que o import dinâmico já resolveu; sem esta
    // espera, os asserts abaixo passariam mesmo se o hook não fizesse nada.
    await waitFor(() => {
      expect(registerPlugin).toHaveBeenCalled();
    });

    // Import resolvido e fontes ainda pendentes: nada de refresh, e nenhum
    // listener de `load` (que nunca dispararia neste ponto).
    expect(refresh).not.toHaveBeenCalled();
    expect(
      adicionarListener.mock.calls.some(([evento]) => evento === 'load'),
    ).toBe(false);

    liberarFontes();
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });

    adicionarListener.mockRestore();
    restaurarFontes();
    el.remove();
  });

  it('não remede o pin se o componente desmontar antes das fontes ficarem prontas', async () => {
    const refresh = vi.fn();
    const registerPlugin = vi.fn();
    let liberarFontes: () => void = () => {};
    const fontesProntas = new Promise<void>((resolve) => {
      liberarFontes = resolve;
    });
    const restaurarFontes = stubDeFontes(fontesProntas);

    vi.doMock('gsap', () => ({
      gsap: {
        registerPlugin,
        matchMedia: vi.fn(() => ({ add: vi.fn(), revert: vi.fn() })),
      },
    }));
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh } }));

    const { useNarrativaScroll } = await import('../../hooks/useNarrativaScroll');

    const el = document.createElement('section');
    document.body.appendChild(el);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    // Só desmonta depois do import ter resolvido: senão o refresh nunca seria
    // agendado e o teste passaria sem exercitar o cancelamento.
    await waitFor(() => {
      expect(registerPlugin).toHaveBeenCalled();
    });

    unmount();
    liberarFontes();
    await fontesProntas;
    // Uma volta a mais na microtask queue, para o `.then()` do hook rodar
    // caso o cancelamento não estivesse funcionando.
    await Promise.resolve();

    expect(refresh).not.toHaveBeenCalled();

    restaurarFontes();
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

    // Toda entrada começa junto com a saída da cena de cima ('<'), formando
    // um crossfade. Com '>' as duas ficavam consecutivas e havia um instante
    // com as duas em autoAlpha 0.
    expect(entradas).toHaveLength(4);
    expect(entradas.every((c) => c.posicao === '<')).toBe(true);

    // Toda saída espera a mesma pausa (0.6s) depois da entrada terminar.
    expect(saidas).toHaveLength(4);
    expect(saidas.every((c) => c.posicao === '>0.6')).toBe(true);

    // Asserir as strings de posição não basta: elas já foram '>' e o teste
    // passava enquanto a tela ficava em branco em 11% do scroll. Aqui a
    // timeline é reconstruída e o alfa de cada cena é simulado, para provar
    // que em nenhum instante todas as cenas estão apagadas ao mesmo tempo.
    const DUR = 0.5;
    const PAUSA_ESPERADA = 0.6;
    type Evento = { tipo: 'entra' | 'sai'; cena: number; ini: number; fim: number };
    const eventos: Evento[] = [];
    let fim = 0;
    let iniAnterior = 0;
    for (let i = 0; i < cenas.length; i++) {
      if (i > 0) {
        // posição '<': começa junto com a tween anterior.
        eventos.push({ tipo: 'entra', cena: i, ini: iniAnterior, fim: iniAnterior + DUR });
        fim = Math.max(fim, iniAnterior + DUR);
      }
      if (i < cenas.length - 1) {
        const ini = fim + PAUSA_ESPERADA;
        eventos.push({ tipo: 'sai', cena: i, ini, fim: ini + DUR });
        iniAnterior = ini;
        fim = ini + DUR;
      }
    }

    const alfa = (cena: number, t: number) => {
      let a = cena === 0 ? 1 : 0;
      for (const e of eventos) {
        if (e.cena !== cena) continue;
        const p = Math.min(1, Math.max(0, (t - e.ini) / (e.fim - e.ini)));
        a = e.tipo === 'entra' ? p : Math.min(a, 1 - p);
      }
      return a;
    };

    const total = fim + PAUSA_ESPERADA;
    let alfaMaximoMaisBaixo = 1;
    for (let t = 0; t <= total; t += 0.01) {
      const maiorAlfa = Math.max(...cenas.map((_, c) => alfa(c, t)));
      alfaMaximoMaisBaixo = Math.min(alfaMaximoMaisBaixo, maiorAlfa);
    }
    // Sempre há uma cena com pelo menos metade da opacidade na tela.
    expect(alfaMaximoMaisBaixo).toBeGreaterThanOrEqual(0.5);

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
