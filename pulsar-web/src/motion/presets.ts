import type { Transition, Variants } from 'motion/react';

/**
 * Tokens de animação do Pulsar. Centraliza durações e easings para manter as
 * micro-interações consistentes (premium = sutileza, não excesso).
 *
 * Acessibilidade: o respeito a `prefers-reduced-motion` é global, via
 * `<MotionConfig reducedMotion="user">` em main.tsx — não precisa tratar caso a caso.
 */

export const DURACAO = {
  rapida: 0.16,
  media: 0.24,
  lenta: 0.36,
} as const;

// Easing suave padrão (saída desacelerada), agradável para entradas de UI.
export const EASE_SUAVE: Transition['ease'] = [0.22, 1, 0.36, 1];

/** Entrada de baixo com leve subida — bom para toasts e elementos pontuais. */
export const subirSuave: Variants = {
  inicial: { opacity: 0, y: 12 },
  animar: { opacity: 1, y: 0, transition: { duration: DURACAO.media, ease: EASE_SUAVE } },
  sair: { opacity: 0, y: 8, transition: { duration: DURACAO.rapida, ease: 'easeIn' } },
};

/** Container que escalona a entrada dos filhos (efeito stagger). */
export const containerStagger: Variants = {
  animar: { transition: { staggerChildren: 0.05 } },
};

/** Item de uma lista com stagger (usar junto de `containerStagger`). */
export const itemStagger: Variants = {
  inicial: { opacity: 0, y: 10 },
  animar: { opacity: 1, y: 0, transition: { duration: DURACAO.media, ease: EASE_SUAVE } },
};
