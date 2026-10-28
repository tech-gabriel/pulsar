import { useLayoutEffect, type RefObject } from 'react';

const CURVA = 'cubic-bezier(.32, .72, 0, 1)'; // a das folhas do iOS: sai rápido e assenta sem rebote

/**
 * O elemento muda de altura com o conteúdo (lista, detalhe, resultados da busca), e a troca
 * vira uma transição em vez de um salto: o ResizeObserver percebe a nova altura antes da
 * pintura e anima da altura anterior até ela. `data-altura-final` guarda o destino, para quem
 * precisa da altura que o cartão vai ter (o mapa, ao centralizar fora dele).
 * Com menos movimento pedido no sistema, só troca.
 */
export function useAlturaFluida(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let ultima = el.getBoundingClientRect().height;
    el.dataset.alturaFinal = String(ultima);
    let anim: Animation | null = null;

    const ro = new ResizeObserver(() => {
      if (anim) return; // a própria animação muda a altura a cada quadro
      const nova = el.getBoundingClientRect().height;
      el.dataset.alturaFinal = String(nova);
      if (semMovimento || Math.abs(nova - ultima) < 2) { ultima = nova; return; }
      anim = el.animate([{ height: `${ultima}px` }, { height: `${nova}px` }], { duration: 420, easing: CURVA });
      ultima = nova;
      const fim = () => { anim = null; ultima = el.getBoundingClientRect().height; el.dataset.alturaFinal = String(ultima); };
      anim.onfinish = fim;
      anim.oncancel = fim;
    });
    ro.observe(el);
    return () => { ro.disconnect(); anim?.cancel(); };
  }, [ref]);
}
