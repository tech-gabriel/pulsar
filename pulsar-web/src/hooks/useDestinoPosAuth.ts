import { useSearchParams } from 'react-router-dom';
import { resolverDeepLink } from '../data/regioes-seo';
import { getMunicipioPorSlug } from '../data/baixada-seo';

/**
 * Destino de navegação após autenticar. Se a URL atual trouxer ?regiao=<slug>
 * de uma zona, subprefeitura ou município da Baixada válido, o app abre focado nele;
 * senão, vai pro /app padrão. Valida o slug para não repassar valor arbitrário adiante.
 */
export function useDestinoPosAuth(): string {
  const [params] = useSearchParams();
  const slug = params.get('regiao');
  return slug && (resolverDeepLink(slug) || getMunicipioPorSlug(slug)) ? `/app?regiao=${slug}` : '/app';
}
