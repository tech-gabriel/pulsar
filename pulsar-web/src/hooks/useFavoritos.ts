import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { FavoritoDto } from '../types';

interface UseFavoritosResult {
  favoritos: FavoritoDto[];
  isFavorito: (regiaoId: string) => boolean;
  toggleFavorito: (regiaoId: string) => Promise<void>;
  carregando: boolean;
}

export function useFavoritos(usuarioId: string | null): UseFavoritosResult {
  const [favoritos, setFavoritos] = useState<FavoritoDto[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;
    setCarregando(true);
    api
      .get<FavoritoDto[]>(`/usuarios/${usuarioId}/favoritos`)
      .then(({ data }) => setFavoritos(data))
      .catch(() => {}) // silencioso: favoritos não é crítico
      .finally(() => setCarregando(false));
  }, [usuarioId]);

  const isFavorito = useCallback(
    (regiaoId: string) => favoritos.some((f) => f.regiaoId === regiaoId),
    [favoritos]
  );

  const toggleFavorito = useCallback(
    async (regiaoId: string) => {
      if (!usuarioId) return;
      if (isFavorito(regiaoId)) {
        await api.delete(`/usuarios/${usuarioId}/favoritos/${regiaoId}`);
        setFavoritos((prev) => prev.filter((f) => f.regiaoId !== regiaoId));
      } else {
        const { data } = await api.post<FavoritoDto>(
          `/usuarios/${usuarioId}/favoritos`,
          { regiaoId }
        );
        setFavoritos((prev) => [...prev, data]);
      }
    },
    [usuarioId, isFavorito]
  );

  return { favoritos, isFavorito, toggleFavorito, carregando };
}
