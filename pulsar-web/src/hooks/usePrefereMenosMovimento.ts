import { useEffect, useState } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * `true` quando a pessoa pediu menos movimento no sistema.
 *
 * O `<MotionConfig reducedMotion="user">` do RootLayout cobre só o que passa
 * pelo motion. Animações de terceiros (Lottie) e loops próprios precisam
 * consultar a preferência na mão — é o caso deste hook.
 */
export function usePrefereMenosMovimento(): boolean {
  const [prefere, setPrefere] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.(CONSULTA).matches ?? false;
  });

  useEffect(() => {
    const mq = window.matchMedia?.(CONSULTA);
    if (!mq) return;
    const aoMudar = (e: MediaQueryListEvent) => setPrefere(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  return prefere;
}
