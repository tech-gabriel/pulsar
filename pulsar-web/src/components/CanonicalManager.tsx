import { useHead } from '@unhead/react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://app-pulsar.com.br';

/** Monta a URL canônica da rota: home mantém a barra, o resto sai sem ela. */
function urlCanonica(pathname: string): string {
  if (pathname === '/') return `${ORIGIN}/`;
  return `${ORIGIN}${pathname.replace(/\/+$/, '')}`;
}

/**
 * Dá `canonical` e `og:url` próprios a toda rota.
 *
 * O template index.html declara os dois apontando para a home, e é ele que vira
 * o shell `spa.html` do fallback de roteamento. Sem isto, /login, /cadastro e
 * /app/* anunciavam a home como sua URL canônica. As páginas públicas já
 * chamam `useSeoHead` com exatamente este mesmo valor, então não há disputa:
 * o @unhead deduplica por tag e o resultado é o mesmo de antes nelas.
 *
 * Renderizado uma vez dentro do Router; não desenha nada.
 */
export default function CanonicalManager() {
  const { pathname } = useLocation();
  const url = urlCanonica(pathname);

  useHead({
    link: [{ rel: 'canonical', href: url }],
    meta: [{ property: 'og:url', content: url }],
  });

  return null;
}
