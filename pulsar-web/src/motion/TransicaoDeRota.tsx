import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, COM_MOVIMENTO } from './gsap';

/**
 * Entrada da página nova a cada navegação: o conteúdo (`main` ou o que tiver `data-transicao`)
 * sobe 12 px e aparece em 0,45 s. O cabeçalho fica de fora: é o mesmo em toda página, e mexer
 * nele a cada clique dá sensação de recarga. Não roda na primeira carga nem para quem pediu
 * menos movimento.
 */
export default function TransicaoDeRota() {
  const { pathname } = useLocation();
  const primeira = useRef(true);

  useLayoutEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const alvos = document.querySelectorAll<HTMLElement>('main, [data-transicao]');
    if (alvos.length === 0) return;
    const mm = gsap.matchMedia();
    mm.add(COM_MOVIMENTO, () => {
      gsap.fromTo(alvos, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04, clearProps: 'opacity,visibility,transform',
      });
    });
    return () => mm.revert();
  }, [pathname]);

  return null;
}
