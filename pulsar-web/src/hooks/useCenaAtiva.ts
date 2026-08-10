import { useEffect, useState } from 'react';

/**
 * Reduz a área de detecção a uma linha no meio da viewport: com as margens
 * superior e inferior em -50%, só o alvo que cruza o centro da tela conta como
 * intersectando. É isso que dá a sensação de "a cena troca quando o texto
 * chega no meio", sem prender o scroll.
 */
const LINHA_DO_MEIO = '-50% 0px -50% 0px';

/**
 * Elege a cena ativa da narrativa a partir do scroll, sem sequestrá-lo.
 *
 * Três decisões que valem a leitura:
 *
 * 1. **Dois observers, não um.** O das cenas usa a linha do meio; o do
 *    container usa a viewport inteira, porque `vista` precisa disparar assim
 *    que a seção aparece, e não só quando o primeiro texto chega no centro.
 * 2. **`vista` é monotônico.** Ele existe para a onda de acender tocar uma vez
 *    só; se voltasse a `false` ao sair da viewport, a animação re-disparava a
 *    cada passagem.
 * 3. **Sem `IntersectionObserver` fica na cena inicial.** É o caminho do SSG e
 *    de navegador antigo, e é um degradado legítimo: os 5 textos estão no DOM
 *    e o mapa mostra o primeiro estado.
 */
export function useCenaAtiva<T extends string>(
  ref: React.RefObject<HTMLElement | null>,
  cenaInicial: T,
): { cenaAtiva: T; vista: boolean } {
  const [cenaAtiva, setCenaAtiva] = useState<T>(cenaInicial);
  const [vista, setVista] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const alvos = Array.from(container.querySelectorAll<HTMLElement>('[data-cena]'));
    if (alvos.length === 0) return;

    const observadorCenas = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          // Só quem está cruzando a linha promove. As saídas chegam na mesma
          // leva e, se contassem, a cena voltaria para trás ao rolar.
          if (!entrada.isIntersecting) continue;
          const id = (entrada.target as HTMLElement).dataset.cena;
          if (id) setCenaAtiva(id as T);
        }
      },
      { rootMargin: LINHA_DO_MEIO },
    );
    alvos.forEach((alvo) => observadorCenas.observe(alvo));

    const observadorContainer = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) setVista(true);
    });
    observadorContainer.observe(container);

    return () => {
      observadorCenas.disconnect();
      observadorContainer.disconnect();
    };
  }, [ref]);

  return { cenaAtiva, vista };
}
