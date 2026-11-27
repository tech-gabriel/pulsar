import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { RefObject } from 'react';

// Registro único. No SSG (Node) não há window: o GSAP só roda dentro do useGSAP,
// que é efeito e não executa no render do servidor.
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Só anima quando a pessoa não pediu menos movimento; o matchMedia reverte sozinho. */
export const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, useGSAP };

/**
 * Reveal único de uma landing: todo `[data-revelar]` dentro de `raiz` sobe e aparece ao entrar
 * na tela, em lote, uma vez só. Fica tudo abaixo da dobra, então nada pisca na hidratação.
 */
export function useRevelarAoRolar(raiz: RefObject<HTMLElement | null>): void {
  useGSAP(() => {
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.set('[data-revelar]', { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch('[data-revelar]', {
        start: 'top 88%',
        once: true,
        onEnter: (lote) => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });
    });
  }, { scope: raiz });
}
