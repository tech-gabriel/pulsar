import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { capturarPageview, track } from './events';

/**
 * Dispara um pageview a cada mudança de rota (o SPA não recarrega a página, então
 * o PostHog não veria isso sozinho). Também emite o passo de funil visitou_landing
 * (rota raiz) ou visitou_app (rotas do app).
 */
export function usePageviews(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    capturarPageview(pathname);
    if (pathname === '/') track.visitouLanding(pathname);
    else if (pathname.startsWith('/app')) track.visitouApp(pathname);
  }, [pathname]);
}
