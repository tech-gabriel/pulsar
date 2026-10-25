import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Registro único. No SSG (Node) não há window: o GSAP só roda dentro do useGSAP,
// que é efeito e não executa no render do servidor.
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Só anima quando a pessoa não pediu menos movimento; o matchMedia reverte sozinho. */
export const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, useGSAP };
