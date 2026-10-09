import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocalizacao, GeoError } from '../../hooks/useGeolocalizacao';

const analyticsMock = vi.hoisted(() => ({ usouGeolocalizacao: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { usouGeolocalizacao: analyticsMock.usouGeolocalizacao } }));

// Códigos padrão do GeolocationPositionError
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

/**
 * Simula `watchPosition`: guarda os callbacks para o teste emitir leituras e
 * erros quando quiser, e registra o `clearWatch`.
 */
function mockWatch() {
  let onLeitura: PositionCallback = () => {};
  let onErro: PositionErrorCallback | null | undefined;
  const clearWatch = vi.fn();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (s: PositionCallback, e?: PositionErrorCallback | null) => {
        onLeitura = s;
        onErro = e;
        return 42;
      },
      clearWatch,
    },
  });
  return {
    clearWatch,
    leitura: (latitude: number, longitude: number, accuracy: number) =>
      onLeitura({ coords: { latitude, longitude, accuracy } } as GeolocationPosition),
    erro: (code: number) =>
      onErro?.({ code, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError),
  };
}

describe('useGeolocalizacao', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it('resolve assim que a leitura chega a 50 m ou menos', async () => {
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.leitura(-23.5, -46.6, 900); });
    act(() => { geo.leitura(-23.55, -46.63, 30); });
    await expect(p).resolves.toEqual({ lat: -23.55, lon: -46.63, precisao: 30 });
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
  });

  it('aos 10 s entrega a melhor leitura recebida', async () => {
    vi.useFakeTimers();
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.leitura(-23.5, -46.6, 300); });
    act(() => { geo.leitura(-23.6, -46.7, 1200); }); // pior: não substitui
    act(() => { vi.advanceTimersByTime(10_000); });
    await expect(p).resolves.toEqual({ lat: -23.5, lon: -46.6, precisao: 300 });
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
  });

  it('rejeita com "timeout" se nenhuma leitura chega em 10 s', async () => {
    vi.useFakeTimers();
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { vi.advanceTimersByTime(10_000); });
    await expect(p).rejects.toMatchObject({ tipo: 'timeout' });
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
  });

  it('rejeita com "negado" quando a permissão é negada', async () => {
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.erro(PERMISSION_DENIED); });
    await expect(p).rejects.toMatchObject({ tipo: 'negado' });
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
  });

  it('rejeita com "indisponivel" para posição indisponível sem leitura', async () => {
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.erro(POSITION_UNAVAILABLE); });
    await expect(p).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('erro depois de uma leitura entrega a melhor leitura em vez de falhar', async () => {
    const geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.leitura(-23.5, -46.6, 400); });
    act(() => { geo.erro(POSITION_UNAVAILABLE); });
    await expect(p).resolves.toEqual({ lat: -23.5, lon: -46.6, precisao: 400 });
  });

  it('rejeita com GeoError "sem-suporte" quando a API não existe', async () => {
    const { result } = renderHook(() => useGeolocalizacao());
    let erro: unknown;
    await act(async () => {
      erro = await result.current.detectar().catch((e) => e);
    });
    expect(erro).toBeInstanceOf(GeoError);
    expect((erro as GeoError).tipo).toBe('sem-suporte');
  });

  it('emite usou_geolocalizacao(true) no sucesso e (false) na falha', async () => {
    analyticsMock.usouGeolocalizacao.mockClear();
    let geo = mockWatch();
    const { result } = renderHook(() => useGeolocalizacao());
    let p!: Promise<unknown>;
    act(() => { p = result.current.detectar(); });
    act(() => { geo.leitura(-23.5, -46.6, 10); });
    await p;
    expect(analyticsMock.usouGeolocalizacao).toHaveBeenLastCalledWith(true);

    geo = mockWatch();
    act(() => { p = result.current.detectar(); });
    act(() => { geo.erro(PERMISSION_DENIED); });
    await p.catch(() => {});
    expect(analyticsMock.usouGeolocalizacao).toHaveBeenLastCalledWith(false);
  });
});
