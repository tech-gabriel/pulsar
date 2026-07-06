import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UsuarioDto } from '../../types';

const h = vi.hoisted(() => ({
  posthog: { identify: vi.fn(), reset: vi.fn() },
  estado: { enabled: true },
}));
vi.mock('../../analytics/posthog', () => ({
  posthog: h.posthog,
  isAnalyticsEnabled: () => h.estado.enabled,
}));

import { identifyUser, resetAnalytics } from '../../analytics/identify';

const usuario: UsuarioDto = {
  id: 'u-1',
  nome: 'Ana',
  email: 'ana@example.com',
  perfil: 'CIDADAO',
  role: 'USUARIO',
};

describe('identify', () => {
  beforeEach(() => {
    h.estado.enabled = true;
    h.posthog.identify.mockClear();
    h.posthog.reset.mockClear();
  });

  it('identifyUser usa o id e envia email/nome', () => {
    identifyUser(usuario);
    expect(h.posthog.identify).toHaveBeenCalledWith('u-1', { email: 'ana@example.com', nome: 'Ana' });
  });

  it('resetAnalytics chama posthog.reset', () => {
    resetAnalytics();
    expect(h.posthog.reset).toHaveBeenCalled();
  });

  it('no-op quando desligado', () => {
    h.estado.enabled = false;
    identifyUser(usuario);
    resetAnalytics();
    expect(h.posthog.identify).not.toHaveBeenCalled();
    expect(h.posthog.reset).not.toHaveBeenCalled();
  });
});
