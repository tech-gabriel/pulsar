import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock hoisted: posthog espião + flag de habilitado controlável.
const h = vi.hoisted(() => ({
  posthog: { capture: vi.fn() },
  estado: { enabled: true },
}));
vi.mock('../../analytics/posthog', () => ({
  posthog: h.posthog,
  isAnalyticsEnabled: () => h.estado.enabled,
}));

import { track, capturarPageview } from '../../analytics/events';

describe('track', () => {
  beforeEach(() => {
    h.estado.enabled = true;
    h.posthog.capture.mockClear();
  });

  it('favoritouRegiao emite favoritou_regiao com regiaoId', () => {
    track.favoritouRegiao('r-123');
    expect(h.posthog.capture).toHaveBeenCalledWith('favoritou_regiao', { regiaoId: 'r-123' });
  });

  it('cadastrou emite cadastrou com metodo', () => {
    track.cadastrou('email');
    expect(h.posthog.capture).toHaveBeenCalledWith('cadastrou', { metodo: 'email' });
  });

  it('usouGeolocalizacao emite sucesso booleano', () => {
    track.usouGeolocalizacao(false);
    expect(h.posthog.capture).toHaveBeenCalledWith('usou_geolocalizacao', { sucesso: false });
  });

  it('capturarPageview emite $pageview com o path', () => {
    capturarPageview('/app');
    expect(h.posthog.capture).toHaveBeenCalledWith('$pageview', { path: '/app' });
  });

  it('não emite nada quando o analytics está desligado', () => {
    h.estado.enabled = false;
    track.login('google');
    capturarPageview('/');
    expect(h.posthog.capture).not.toHaveBeenCalled();
  });
});
