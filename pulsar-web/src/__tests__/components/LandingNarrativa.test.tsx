import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingNarrativa from '../../components/landing/LandingNarrativa';
import { CENAS } from '../../data/landing-narrativa';

/** Mock mínimo: aqui só interessa que o componente monte sem quebrar. */
class ObservadorFalso {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_cb: IntersectionObserverCallback, _o?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('LandingNarrativa', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tem as 5 cenas da narrativa', () => {
    expect(CENAS.map((c) => c.id)).toEqual([
      'acender',
      'risco',
      'score',
      'alagamento',
      'alerta',
    ]);
  });

  // Garantia de SEO: sem nenhum JS de animação, todo o texto está no DOM. Se
  // este teste cair, a landing prerenderizada perdeu conteúdo.
  it('renderiza o texto de todas as cenas sem depender de animação', () => {
    render(<LandingNarrativa />);
    for (const cena of CENAS) {
      expect(screen.getByText(cena.titulo)).toBeInTheDocument();
      expect(screen.getByText(cena.texto)).toBeInTheDocument();
    }
  });

  it('cada cena é uma seção com título de nível 2', () => {
    render(<LandingNarrativa />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(CENAS.length);
  });

  // O ponto inteiro da mudança: um mapa, não cinco. Cinco instâncias era o que
  // fazia o mobile repetir a mesma figura por ~2700px.
  it('renderiza um único mapa', () => {
    const { container } = render(<LandingNarrativa />);
    expect(container.querySelectorAll('[data-mapa-cena]')).toHaveLength(1);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('o mapa começa na primeira cena', () => {
    const { container } = render(<LandingNarrativa />);
    expect(container.querySelector('[data-mapa-cena]')).toHaveAttribute(
      'data-mapa-cena',
      CENAS[0].id,
    );
  });

  it('cada cena tem um artigo com o seu data-cena, na ordem', () => {
    const { container } = render(<LandingNarrativa />);
    const artigos = Array.from(container.querySelectorAll('article[data-cena]'));
    expect(artigos.map((a) => a.getAttribute('data-cena'))).toEqual(CENAS.map((c) => c.id));
  });

  // Sem `vista` a onda de acender tocaria no carregamento da página, com a
  // narrativa ainda abaixo da dobra.
  it('não marca data-vista antes da seção entrar na viewport', () => {
    const { container } = render(<LandingNarrativa />);
    expect(container.querySelector('.landing-narrativa')).not.toHaveAttribute('data-vista');
  });

  it('nenhuma copy usa travessão', () => {
    for (const cena of CENAS) {
      expect(`${cena.olho}${cena.titulo}${cena.texto}`).not.toMatch(/[—–]/);
    }
  });
});
