import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';

describe('useNotificacoesPrefs', () => {
  beforeEach(() => localStorage.clear());

  it('prefs salvas antes do aviso de chuva em casa ficam com ele ligado', () => {
    localStorage.setItem('pulsar-notif-prefs', JSON.stringify({ alertaAlto: true, alertaModerado: false, resumoDiario: false }));
    const { result } = renderHook(() => useNotificacoesPrefs());
    expect(result.current.prefs.chuvaLocais).toBe(true);
  });

  it('sem nada salvo, o aviso de chuva em casa nasce ligado', () => {
    const { result } = renderHook(() => useNotificacoesPrefs());
    expect(result.current.prefs.chuvaLocais).toBe(true);
  });
});
