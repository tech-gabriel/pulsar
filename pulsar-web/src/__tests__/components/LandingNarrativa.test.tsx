import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingNarrativa, { CENAS } from '../../components/landing/LandingNarrativa';

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
