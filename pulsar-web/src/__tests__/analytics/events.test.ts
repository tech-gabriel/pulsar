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

  it('favoritouRegiao emite favoritou_regiao com subprefeituraId', () => {
    track.favoritouRegiao('s-123');
    expect(h.posthog.capture).toHaveBeenCalledWith('favoritou_regiao', { subprefeituraId: 's-123' });
  });

  it('eventos da ativação', () => {
    track.passoVisto('escolher', 2, 5);
    expect(h.posthog.capture).toHaveBeenCalledWith('ativacao_passo_visto', { passo: 'escolher', ordem: 2, total: 5 });
    track.passoPulado('instalar');
    expect(h.posthog.capture).toHaveBeenCalledWith('ativacao_passo_pulado', { passo: 'instalar' });
    track.ativacaoConcluida({ favoritas: 2, alerta: true, instalou: false });
    expect(h.posthog.capture).toHaveBeenCalledWith('ativacao_concluida', { favoritas: 2, alerta: true, instalou: false });
    track.instalouApp('ios');
    expect(h.posthog.capture).toHaveBeenCalledWith('instalou_app', { plataforma: 'ios' });
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
