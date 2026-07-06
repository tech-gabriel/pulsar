import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePageviews } from './usePageviews';
import { identifyUser, resetAnalytics } from './identify';

/**
 * Ponte entre o app e o analytics: roda os pageviews e liga a identidade ao
 * ciclo de login/logout. Renderiza null. Deve ficar dentro do BrowserRouter
 * (usePageviews usa useLocation) e do AuthProvider (usa useAuth).
 */
export default function AnalyticsBridge() {
  usePageviews();
  const { usuario } = useAuth();
  const identificadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (usuario && identificadoRef.current !== usuario.id) {
      identifyUser(usuario);
      identificadoRef.current = usuario.id;
    } else if (!usuario && identificadoRef.current !== null) {
      resetAnalytics();
      identificadoRef.current = null;
    }
  }, [usuario]);

  return null;
}
