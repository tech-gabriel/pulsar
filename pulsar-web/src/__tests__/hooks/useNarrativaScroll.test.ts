import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useNarrativaScroll } from '../../hooks/useNarrativaScroll';

describe('useNarrativaScroll', () => {
  // jsdom não tem layout, então o GSAP não deve nem ser importado nos testes.
  // O valor do hook aqui é não explodir e não sujar o DOM.
  it('não quebra quando o elemento não existe', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      useNarrativaScroll(ref);
      return ref;
    });
    expect(result.current.current).toBeNull();
  });

  it('não marca a narrativa como animada sem GSAP carregado', () => {
    const el = document.createElement('section');
    document.body.appendChild(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });
    expect(el.dataset.animada).toBeUndefined();
    el.remove();
  });

  it('respeita prefers-reduced-motion sem tentar carregar o GSAP', async () => {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', matchMedia);

    const el = document.createElement('section');
    document.body.appendChild(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useNarrativaScroll(ref);
      return ref;
    });

    expect(el.dataset.animada).toBeUndefined();
    el.remove();
    vi.unstubAllGlobals();
  });
});
