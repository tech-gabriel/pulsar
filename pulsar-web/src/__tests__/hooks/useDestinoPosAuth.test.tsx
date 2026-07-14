import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useDestinoPosAuth } from '../../hooks/useDestinoPosAuth';

const wrapper = (entry: string) =>
  function W({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };

describe('useDestinoPosAuth', () => {
  it('anexa ?regiao quando o slug é uma zona válida', () => {
    const { result } = renderHook(() => useDestinoPosAuth(), {
      wrapper: wrapper('/cadastro?regiao=zona-leste'),
    });
    expect(result.current).toBe('/app?regiao=zona-leste');
  });

  it('ignora slug inválido e vai pro app', () => {
    const { result } = renderHook(() => useDestinoPosAuth(), {
      wrapper: wrapper('/cadastro?regiao=hackerman'),
    });
    expect(result.current).toBe('/app');
  });

  it('sem param vai pro app', () => {
    const { result } = renderHook(() => useDestinoPosAuth(), { wrapper: wrapper('/cadastro') });
    expect(result.current).toBe('/app');
  });
});
