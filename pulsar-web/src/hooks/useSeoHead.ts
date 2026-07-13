import { useHead } from '@unhead/react';

const ORIGIN = 'https://app-pulsar.com.br';

/**
 * Define o <head> específico de uma página pública (title/description/canonical
 * /og/twitter). Os defaults globais (og:image, og:site_name, JSON-LD) ficam no
 * template index.html; aqui só sobrescrevemos o que é por-página. O @unhead
 * deduplica por tag, então estas tags substituem as do template.
 */
export function useSeoHead(opts: { title: string; descricao: string; path: string; jsonLd?: object }): void {
  const url = `${ORIGIN}${opts.path}`;
  useHead({
    title: opts.title,
    link: [{ rel: 'canonical', href: url }],
    meta: [
      { name: 'description', content: opts.descricao },
      { property: 'og:title', content: opts.title },
      { property: 'og:description', content: opts.descricao },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: opts.title },
      { name: 'twitter:description', content: opts.descricao },
    ],
    ...(opts.jsonLd
      ? { script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(opts.jsonLd) }] }
      : {}),
  });
}
