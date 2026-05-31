import { useEffect, useRef, useState } from 'react';

/**
 * Anima um número de 0 até `target` com easing ease-out (ETAPA 4.6).
 * Reinicia sempre que `target` muda. Respeita prefers-reduced-motion,
 * indo direto ao valor final.
 */
export function useCountUp(target: number, duration = 800): number {
  const [valor, setValor] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduzir =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir || duration <= 0) {
      // rAF (em vez de setState síncrono) para ir direto ao valor final.
      rafRef.current = requestAnimationFrame(() => setValor(target));
      return () => cancelAnimationFrame(rafRef.current);
    }

    const inicio = performance.now();
    const animar = (agora: number) => {
      const t = Math.min((agora - inicio) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValor(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animar);
    };
    rafRef.current = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return valor;
}
