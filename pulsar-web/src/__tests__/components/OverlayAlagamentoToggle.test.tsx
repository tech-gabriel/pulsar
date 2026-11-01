import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OverlayAlagamentoToggle from '../../components/mapa/OverlayAlagamentoToggle';

describe('OverlayAlagamentoToggle', () => {
  it('reflete o estado desligado em aria-pressed', () => {
    render(<OverlayAlagamentoToggle ativo={false} onToggle={vi.fn()} isMobile={false} />);
    const btn = screen.getByRole('button', { name: /alagamentos/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflete o estado ligado em aria-pressed', () => {
    render(<OverlayAlagamentoToggle ativo onToggle={vi.fn()} isMobile={false} />);
    expect(screen.getByRole('button', { name: /alagamentos/i })).toHaveAttribute('aria-pressed', 'true');
    // A classe é o que pinta o ativo: o vidro (!important) ignora estilo inline.
    expect(screen.getByRole('button', { name: /alagamentos/i })).toHaveClass('ativo');
  });

  it('chama onToggle ao clicar', () => {
    const onToggle = vi.fn();
    render(<OverlayAlagamentoToggle ativo={false} onToggle={onToggle} isMobile={false} />);
    fireEvent.click(screen.getByRole('button', { name: /alagamentos/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
