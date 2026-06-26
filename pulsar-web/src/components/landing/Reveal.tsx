import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';

/**
 * Revela o conteúdo ao entrar na viewport (sobe + fade). O respeito a
 * `prefers-reduced-motion` é global (MotionConfig em main.tsx).
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: DURACAO.lenta, ease: EASE_SUAVE, delay }}
    >
      {children}
    </motion.div>
  );
}
