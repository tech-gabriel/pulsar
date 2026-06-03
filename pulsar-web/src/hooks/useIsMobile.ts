import { useCallback, useSyncExternalStore } from 'react';

/**
 * Indica se a viewport está abaixo do breakpoint (mobile). Usa
 * useSyncExternalStore para se inscrever no matchMedia sem setState em effect.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
