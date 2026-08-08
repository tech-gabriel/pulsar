import { useEffect } from 'react';

/**
 * Aplica a narrativa por scroll (pin + scrub) sobre a `LandingNarrativa`.
 *
 * Três decisões que valem a leitura:
 *
 * 1. **Import dinâmico.** GSAP com ScrollTrigger custa ~50 KB gzip. A landing é
 *    a principal porta de SEO do produto, então ele não pode entrar no bundle
 *    inicial nem atrasar o LCP. Carrega depois da montagem, no cliente.
 * 2. **O estado degradado é o padrão.** O CSS já entrega as cenas empilhadas e
 *    legíveis. Este hook só *acrescenta*. Se o import falhar, a página fica
 *    inteira, não quebrada; por isso o catch é silencioso.
 * 3. **`gsap.matchMedia`** resolve desktop, mobile e `prefers-reduced-motion` no
 *    mesmo lugar, e reverte sozinho quando a condição deixa de valer.
 *
 * O atributo `data-animada` no container é o contrato com o CSS: enquanto ele
 * não existir, vale o layout empilhado.
 */
export function useNarrativaScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sem layout (SSG/jsdom) ou com menos movimento pedido: fica no degradado.
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let limpar: (() => void) | undefined;
    let cancelado = false;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);
        if (cancelado) return;

        gsap.registerPlugin(ScrollTrigger);

        const mm = gsap.matchMedia();

        // Pin só no desktop. Prender a tela no celular atrapalha mais do que ajuda.
        mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
          const cenas = el.querySelectorAll<HTMLElement>('[data-cena]');
          if (cenas.length === 0) return;

          el.dataset.animada = 'true';

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el,
              start: 'top top',
              end: () => `+=${cenas.length * 100}%`,
              scrub: 1,
              pin: true,
              pinSpacing: true,
              invalidateOnRefresh: true,
            },
          });

          // Cada cena entra e sai; a primeira já começa visível.
          cenas.forEach((cena, i) => {
            if (i > 0) {
              tl.fromTo(
                cena,
                { autoAlpha: 0, y: 40 },
                { autoAlpha: 1, y: 0, duration: 0.5 },
                i === 1 ? '>' : '>0.2',
              );
            }
            if (i < cenas.length - 1) {
              tl.to(cena, { autoAlpha: 0, y: -40, duration: 0.5 }, '>0.6');
            }
          });

          return () => {
            delete el.dataset.animada;
          };
        });

        // Imagens e fontes mudam altura depois da hidratação; sem o refresh o
        // pin mede errado e a narrativa fica deslocada.
        const aoCarregar = () => ScrollTrigger.refresh();
        window.addEventListener('load', aoCarregar);

        limpar = () => {
          window.removeEventListener('load', aoCarregar);
          mm.revert();
        };
      } catch {
        // GSAP não carregou: segue o degradado, que é legível. Sem barulho.
      }
    })();

    return () => {
      cancelado = true;
      limpar?.();
    };
  }, [ref]);
}
