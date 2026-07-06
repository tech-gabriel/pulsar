import posthog from 'posthog-js';

// Host padrão do PostHog Cloud US. Sobrescrevível por env.
const HOST_PADRAO = 'https://us.i.posthog.com';

let enabled = false;

/**
 * Inicializa o PostHog uma única vez, em modo privacy-first. Sem
 * VITE_POSTHOG_KEY o analytics fica desligado e todo o resto vira no-op —
 * mesmo padrão de VITE_MAPTILER_KEY / VITE_GOOGLE_CLIENT_ID.
 */
export function initAnalytics(): void {
  if (enabled) return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || HOST_PADRAO;
  if (!key) return;
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  });
  enabled = true;
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export { posthog };
