import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, animate } from 'motion/react';

/**
 * Número que "conta" do zero até o valor final quando entra na viewport.
 * Usado nas estatísticas da landing para dar vida aos dados sem exagero.
 * Respeita `prefers-reduced-motion` (MotionConfig global): nesse caso o motion
 * resolve a animação instantaneamente, então o número já aparece no valor final.
 */
export default function Contador({
  para,
  duracao = 1.4,
  sufixo = '',
  prefixo = '',
}: {
  para: number;
  duracao?: number;
  sufixo?: string;
  prefixo?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const emVista = useInView(ref, { once: true, amount: 0.6 });
  const valor = useMotionValue(0);

  useEffect(() => {
    if (!emVista) return;
    const controls = animate(valor, para, {
      duration: duracao,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefixo}${Math.round(v)}${sufixo}`;
      },
    });
    return () => controls.stop();
  }, [emVista, para, duracao, sufixo, prefixo, valor]);

  // Valor inicial renderizado no SSR/primeira pintura.
  return <span ref={ref}>{`${prefixo}0${sufixo}`}</span>;
}
