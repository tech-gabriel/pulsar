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
 *    legíveis. Este hook só *acrescenta*. Se o import falhar, ou se qualquer
 *    coisa lançar depois que `data-animada` já foi setado, a página tem que
 *    voltar para o degradado, nunca ficar parada no meio do caminho (cenas em
 *    `position: absolute` sobrepostas com `opacity: 0` do CSS, sem timeline
 *    por cima para revelá-las); por isso o catch é silencioso mas desfaz o
 *    estado.
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

        // As fontes web mudam a altura do texto depois da hidratação, e o pin
        // fica deslocado se for medido antes disso. Não dá para pendurar no
        // evento `load`: quando este import dinâmico resolve, e em qualquer
        // navegação SPA para cá, `load` já disparou e o listener nunca
        // rodaria. `document.fonts.ready` cobre os dois caminhos, porque já
        // vem resolvida quando as fontes terminaram. (O mapa é SVG inline;
        // não há raster para esperar.)
        let refreshCancelado = false;
        const fontesProntas = document.fonts?.ready ?? Promise.resolve();
        fontesProntas
          .then(() => {
            if (!refreshCancelado && !cancelado) ScrollTrigger.refresh();
          })
          .catch(() => {
            /* medir com a métrica antiga é melhor do que não medir */
          });

        // Atribuído antes do `mm.add`: se o callback abaixo lançar depois de
        // já ter setado `data-animada`, o catch precisa conseguir chamar
        // `mm.revert()` (e cancelar o refresh pendente) mesmo sem o `mm.add`
        // ter terminado de rodar.
        limpar = () => {
          refreshCancelado = true;
          mm.revert();
        };

        // Pin só no desktop. Prender a tela no celular atrapalha mais do que ajuda.
        mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
          const cenas = el.querySelectorAll<HTMLElement>('[data-cena]');
          if (cenas.length === 0) return;

          // Setado antes da timeline de propósito: o ScrollTrigger mede o pin
          // no momento em que é criado, e precisa medir contra o layout já
          // convertido para `position: absolute` (ver index.css), não contra
          // o empilhado. Se algo lançar daqui até o fim deste callback, é o
          // catch abaixo que desfaz.
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

          const DURACAO_TRANSICAO = 0.5;
          const PAUSA = 0.6;

          // Cada cena entra e sai; a primeira já começa visível.
          //
          // A entrada é posicionada em `'<'` (início da tween anterior, que é
          // sempre a saída da cena de cima), e não em `'>'`. Com `'>'` a saída
          // e a entrada ficavam estritamente consecutivas: no ponto de troca as
          // duas cenas estavam em `autoAlpha: 0` e a viewport fixada ficava
          // vazia. Eram ~14vh de tela quase em branco por transição, 57vh no
          // total, 11% da narrativa. Em `'<'` as duas animam juntas e a soma
          // dos alfas fica perto de 1 o tempo todo (crossfade de verdade).
          cenas.forEach((cena, i) => {
            if (i > 0) {
              tl.fromTo(
                cena,
                { autoAlpha: 0, y: 40 },
                { autoAlpha: 1, y: 0, duration: DURACAO_TRANSICAO },
                '<',
              );
            }
            if (i < cenas.length - 1) {
              tl.to(cena, { autoAlpha: 0, y: -40, duration: DURACAO_TRANSICAO }, `>${PAUSA}`);
            }
          });

          // A última cena é o clímax/gancho de conversão: precisa de um
          // tempo de tela antes do pin soltar, senão o scroll passa direto
          // por ela no instante em que termina de entrar.
          tl.to({}, { duration: PAUSA });

          return () => {
            delete el.dataset.animada;
          };
        });
      } catch {
        // Sob StrictMode (mount, cleanup, mount), a instância cancelada não
        // pode mexer no estado da instância nova que já pode estar rodando.
        if (cancelado) return;
        // Nenhuma falha pode deixar o CSS colapsado sem timeline por cima.
        delete el.dataset.animada;
        limpar?.();
        limpar = undefined;
      }
    })();

    return () => {
      cancelado = true;
      limpar?.();
    };
  }, [ref]);
}
