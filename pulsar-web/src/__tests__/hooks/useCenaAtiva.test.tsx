import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useRef } from 'react';
import { useCenaAtiva } from '../../hooks/useCenaAtiva';

/**
 * Mock mínimo de IntersectionObserver. Guarda callback, opções e alvos para
 * o teste conseguir disparar entradas na mão e afirmar sobre a configuração.
 */
class ObservadorFalso {
  static instancias: ObservadorFalso[] = [];
  callback: IntersectionObserverCallback;
  opcoes?: IntersectionObserverInit;
  alvos: Element[] = [];
  desconectado = false;

  constructor(cb: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
    this.callback = cb;
    this.opcoes = opcoes;
    ObservadorFalso.instancias.push(this);
  }

  observe(el: Element) {
    this.alvos.push(el);
  }
  unobserve(el: Element) {
    this.alvos = this.alvos.filter((a) => a !== el);
  }
  disconnect() {
    this.alvos = [];
    this.desconectado = true;
  }
  takeRecords() {
    return [];
  }

  /** Dispara a callback como o navegador faria. */
  disparar(entradas: { target: Element; isIntersecting: boolean }[]) {
    act(() => {
      this.callback(entradas as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    });
  }
}

/** O observer das cenas é o primeiro criado; o do container é o segundo. */
const obsCenas = () => ObservadorFalso.instancias[0];
const obsContainer = () => ObservadorFalso.instancias[1];

function Sonda({ cenaInicial = 'acender' }: { cenaInicial?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const { cenaAtiva, vista } = useCenaAtiva(ref, cenaInicial);
  return (
    <section ref={ref}>
      <p data-testid="ativa">{cenaAtiva}</p>
      <p data-testid="vista">{String(vista)}</p>
      <article data-cena="acender">um</article>
      <article data-cena="risco">dois</article>
      <article data-cena="score">tres</article>
      {/* O mapa usa `data-mapa-cena`, não `data-cena`: não pode ser observado. */}
      <div data-mapa-cena="acender">mapa</div>
    </section>
  );
}

describe('useCenaAtiva', () => {
  beforeEach(() => {
    ObservadorFalso.instancias = [];
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('começa na cena inicial', () => {
    render(<Sonda />);
    expect(screen.getByTestId('ativa')).toHaveTextContent('acender');
  });

  it('observa a linha do meio da viewport', () => {
    render(<Sonda />);
    expect(obsCenas().opcoes?.rootMargin).toBe('-50% 0px -50% 0px');
  });

  it('observa os artigos de cena da sonda e nunca o mapa', () => {
    render(<Sonda />);
    const observados = obsCenas().alvos.map((a) => (a as HTMLElement).dataset.cena);
    expect(observados).toEqual(['acender', 'risco', 'score']);
    expect(obsCenas().alvos.some((a) => (a as HTMLElement).dataset.mapaCena)).toBe(false);
  });

  it('troca para a cena do alvo que cruza a linha', () => {
    render(<Sonda />);
    const alvoScore = document.querySelector('[data-cena="score"]')!;
    obsCenas().disparar([{ target: alvoScore, isIntersecting: true }]);
    expect(screen.getByTestId('ativa')).toHaveTextContent('score');
  });

  it('ignora alvos que estão saindo da linha', () => {
    render(<Sonda />);
    const alvoRisco = document.querySelector('[data-cena="risco"]')!;
    const alvoScore = document.querySelector('[data-cena="score"]')!;
    obsCenas().disparar([{ target: alvoScore, isIntersecting: true }]);
    obsCenas().disparar([{ target: alvoRisco, isIntersecting: false }]);
    expect(screen.getByTestId('ativa')).toHaveTextContent('score');
  });

  it('mantém a última cena quando nada está cruzando', () => {
    render(<Sonda />);
    const alvoScore = document.querySelector('[data-cena="score"]')!;
    obsCenas().disparar([{ target: alvoScore, isIntersecting: true }]);
    obsCenas().disparar([{ target: alvoScore, isIntersecting: false }]);
    expect(screen.getByTestId('ativa')).toHaveTextContent('score');
  });

  it('vista começa falso e vira verdadeiro quando a seção entra', () => {
    render(<Sonda />);
    expect(screen.getByTestId('vista')).toHaveTextContent('false');
    const secao = document.querySelector('section')!;
    obsContainer().disparar([{ target: secao, isIntersecting: true }]);
    expect(screen.getByTestId('vista')).toHaveTextContent('true');
  });

  it('vista não volta atrás quando a seção sai da viewport', () => {
    render(<Sonda />);
    const secao = document.querySelector('section')!;
    obsContainer().disparar([{ target: secao, isIntersecting: true }]);
    obsContainer().disparar([{ target: secao, isIntersecting: false }]);
    expect(screen.getByTestId('vista')).toHaveTextContent('true');
  });

  it('desconecta os observers no unmount', () => {
    const { unmount } = render(<Sonda />);
    const cenas = obsCenas();
    const container = obsContainer();
    unmount();
    expect(cenas.desconectado).toBe(true);
    expect(container.desconectado).toBe(true);
  });

  // Degradado: em SSG e em navegador antigo o construtor não existe. O hook
  // não pode lançar, e a página tem que continuar na cena inicial.
  it('não quebra quando IntersectionObserver não existe', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => render(<Sonda />)).not.toThrow();
    expect(screen.getByTestId('ativa')).toHaveTextContent('acender');
  });
});
