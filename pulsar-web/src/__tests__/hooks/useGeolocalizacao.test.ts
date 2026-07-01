import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocalizacao, GeoError } from '../../hooks/useGeolocalizacao';

// Códigos padrão do GeolocationPositionError
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function mockGeolocation(impl: Partial<Geolocation>) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: impl,
  });
}

describe('useGeolocalizacao', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // remove o mock entre testes
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it('resolve com lat/lon quando o navegador retorna a posição', async () => {
    mockGeolocation({
      getCurrentPosition: (success) =>
        success({ coords: { latitude: -23.55, longitude: -46.63 } } as GeolocationPosition),
    });
    const { result } = renderHook(() => useGeolocalizacao());
    let ponto: { lat: number; lon: number } | undefined;
    await act(async () => {
      ponto = await result.current.detectar();
    });
    expect(ponto).toEqual({ lat: -23.55, lon: -46.63 });
  });

  it('rejeita com GeoError "negado" quando a permissão é negada', async () => {
    mockGeolocation({
      getCurrentPosition: (_s, error) =>
        error?.({ code: PERMISSION_DENIED, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useGeolocalizacao());
    await expect(
      act(async () => { await result.current.detectar(); }),
    ).rejects.toMatchObject({ tipo: 'negado' });
  });

  it('rejeita com "timeout" quando expira', async () => {
    mockGeolocation({
      getCurrentPosition: (_s, error) =>
        error?.({ code: TIMEOUT, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useGeolocalizacao());
    await expect(
      act(async () => { await result.current.detectar(); }),
    ).rejects.toMatchObject({ tipo: 'timeout' });
  });

  it('rejeita com "indisponivel" para posição indisponível', async () => {
    mockGeolocation({
      getCurrentPosition: (_s, error) =>
        error?.({ code: POSITION_UNAVAILABLE, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useGeolocalizacao());
    await expect(
      act(async () => { await result.current.detectar(); }),
    ).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('rejeita com "sem-suporte" quando a API não existe', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    const { result } = renderHook(() => useGeolocalizacao());
    await expect(
      act(async () => { await result.current.detectar(); }),
    ).rejects.toBeInstanceOf(GeoError);
  });
});
