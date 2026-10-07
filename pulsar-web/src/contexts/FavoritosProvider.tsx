import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { FavoritosContext } from './FavoritosContext';
import { useFavoritosEstado } from '../hooks/useFavoritos';

/**
 * Fonte única das favoritas do app logado: o sino (Header remonta a cada página) e a
 * página aberta liam cada um a sua cópia, com um GET extra por navegação e o sino
 * desatualizado até trocar de página depois de favoritar.
 */
export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const value = useFavoritosEstado(usuario?.id ?? null);
  return <FavoritosContext.Provider value={value}>{children}</FavoritosContext.Provider>;
}
