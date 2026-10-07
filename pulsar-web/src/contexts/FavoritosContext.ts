import { createContext } from 'react';
import type { UseFavoritosResult } from '../hooks/useFavoritos';

export const FavoritosContext = createContext<UseFavoritosResult | null>(null);
