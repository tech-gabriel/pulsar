import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingNarrativa from '../../components/landing/LandingNarrativa';
import { CENAS } from '../../data/landing-narrativa';

// O `useNarrativaScroll` dispara `import('gsap')` sem await assim que o
// componente monta, e a checagem de reduced-motion não segura nada aqui: o
// `matchMedia` do jsdom devolve `matches: false` para qualquer query. Sem
// estes mocks o GSAP real carrega no meio da suíte, roda `registerPlugin` e
// deixa um listener de `load` no window depois que o teste já terminou.
// O comportamento do hook é coberto em `hooks/useNarrativaScroll.test.ts`;
// aqui só interessa o conteúdo renderizado sem animação nenhuma.
vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    matchMedia: () => ({ add: vi.fn(), revert: vi.fn() }),
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh: vi.fn() } }));

describe('LandingNarrativa', () => {
  it('tem as 5 cenas da narrativa', () => {
    expect(CENAS.map((c) => c.id)).toEqual([
      'acender',
      'risco',
      'score',
      'alagamento',
      'alerta',
    ]);
  });

  // Esta é a garantia de SEO: sem nenhum JS de animação, todo o texto está no
  // DOM. Se este teste cair, a landing prerenderizada perdeu conteúdo.
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

  it('nenhuma copy usa travessão', () => {
    for (const cena of CENAS) {
      expect(`${cena.olho}${cena.titulo}${cena.texto}`).not.toMatch(/[—–]/);
    }
  });
});
