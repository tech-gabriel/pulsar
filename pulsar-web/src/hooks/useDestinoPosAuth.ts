import { useSearchParams } from 'react-router-dom';
import { getZonaPorSlug } from '../data/regioes-seo';

/**
 * Destino de navegação após autenticar. Se a URL atual trouxer ?regiao=<slug>
 * de uma zona válida, o app abre focado nela; senão, vai pro /app padrão.
 * Valida o slug para não repassar valor arbitrário adiante.
 */
export function useDestinoPosAuth(): string {
  const [params] = useSearchParams();
  const slug = params.get('regiao');
  return slug && getZonaPorSlug(slug) ? `/app?regiao=${slug}` : '/app';
}
