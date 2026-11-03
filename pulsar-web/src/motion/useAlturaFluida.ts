import { useLayoutEffect, type RefObject } from 'react';

const CURVA = 'cubic-bezier(.32, .72, 0, 1)'; // a das folhas do iOS: sai rápido e assenta sem rebote
const DURACAO = 420;

/**
 * O elemento muda de altura com o conteúdo (lista, detalhe, resultados da busca), e a troca
 * vira uma transição em vez de um salto: o ResizeObserver percebe a nova altura antes da
 * pintura e anima da altura anterior até ela. `data-altura-final` guarda o destino, para quem
 * precisa da altura que o cartão vai ter (o mapa, ao centralizar fora dele).
 * Interrompível: se o conteúdo muda no meio da animação, ela recomeça da altura em que está
 * para a nova. Com menos movimento pedido no sistema, só troca.
 * `montado`: para elemento que desmonta e volta (a folha do celular), refaz a observação.
 */
export function useAlturaFluida(ref: RefObject<HTMLElement | null>, montado = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!montado || !el || typeof ResizeObserver === 'undefined') return;
    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let ultima = el.getBoundingClientRect().height;
    el.dataset.alturaFinal = String(ultima);
    let anim: Animation | null = null;

    const animar = (de: number, duracao = DURACAO) => {
      const nova = el.getBoundingClientRect().height;
      el.dataset.alturaFinal = String(nova);
      ultima = nova;
      if (semMovimento || Math.abs(nova - de) < 2) return;
      anim = el.animate([{ height: `${de}px` }, { height: `${nova}px` }], { duration: duracao, easing: CURVA });
      const fim = () => { anim = null; ultima = el.getBoundingClientRect().height; el.dataset.alturaFinal = String(ultima); };
      anim.onfinish = fim;
      anim.oncancel = fim;
    };

    const ro = new ResizeObserver(() => {
      if (anim) return; // a própria animação muda a altura a cada quadro; mudança de conteúdo vem pelo MutationObserver
      animar(ultima);
    });

    // Conteúdo mudou com a animação em curso: parte da altura atual. Se o destino não mudou,
    // termina no tempo que faltava em vez de recomeçar a curva inteira.
    const mo = new MutationObserver(() => {
      if (!anim) return;
      const atual = parseFloat(getComputedStyle(el).height);
      const alvo = ultima;
      const restante = Math.max(120, DURACAO - Number(anim.currentTime ?? 0));
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
      anim = null;
      const nova = el.getBoundingClientRect().height;
      animar(atual, Math.abs(nova - alvo) < 2 ? restante : DURACAO);
    });

    ro.observe(el);
    // Atributos só os de layout: o estilo inline (transform da entrada da folha) muda a cada quadro.
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'data-aberta', 'data-detalhe'] });
    return () => { ro.disconnect(); mo.disconnect(); anim?.cancel(); };
  }, [ref, montado]);
}
