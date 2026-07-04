import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocka o SDK: só precisamos observar init.
vi.mock('posthog-js', () => ({ default: { init: vi.fn() } }));

describe('initAnalytics', () => {
  beforeEach(() => {
    vi.resetModules();      // zera o estado `enabled` do módulo entre testes
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('não inicializa quando VITE_POSTHOG_KEY está vazio', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const posthog = (await import('posthog-js')).default;
    const { initAnalytics, isAnalyticsEnabled } = await import('../../analytics/posthog');
    initAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('inicializa com a chave e config privacy-first', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    const posthog = (await import('posthog-js')).default;
    const { initAnalytics, isAnalyticsEnabled } = await import('../../analytics/posthog');
    initAnalytics();
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        person_profiles: 'identified_only',
      }),
    );
    expect(isAnalyticsEnabled()).toBe(true);
  });
});
