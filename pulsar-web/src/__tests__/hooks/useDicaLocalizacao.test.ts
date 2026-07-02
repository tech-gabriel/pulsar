import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDicaLocalizacao } from '../../hooks/useDicaLocalizacao';

describe('useDicaLocalizacao', () => {
  beforeEach(() => localStorage.clear());

  it('mostra a dica na 1ª visita', () => {
    const { result } = renderHook(() => useDicaLocalizacao());
    expect(result.current.mostrarDica).toBe(true);
  });

  it('não mostra depois de dispensada (persistente)', () => {
    const primeiro = renderHook(() => useDicaLocalizacao());
    act(() => primeiro.result.current.dispensar());
    expect(primeiro.result.current.mostrarDica).toBe(false);
    // novo mount lê o localStorage e já não mostra
    const segundo = renderHook(() => useDicaLocalizacao());
    expect(segundo.result.current.mostrarDica).toBe(false);
  });
});
