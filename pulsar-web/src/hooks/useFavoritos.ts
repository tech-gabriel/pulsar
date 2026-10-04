import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { FavoritoDto } from '../types';
import { useToast } from '../contexts/ToastContext';
import { track } from '../analytics';

interface UseFavoritosResult {
  favoritos: FavoritoDto[];
  isFavorito: (subprefeituraId: string) => boolean;
  toggleFavorito: (subprefeituraId: string) => Promise<void>;
  adicionarVarios: (ids: string[]) => Promise<boolean>;
  carregando: boolean;
}

export function useFavoritos(usuarioId: string | null): UseFavoritosResult {
  const [favoritos, setFavoritos] = useState<FavoritoDto[]>([]);
  // Começa carregando quando há usuário: quem decide "sem favoritas" (banner) não pode
  // concluir isso antes da primeira resposta.
  const [carregando, setCarregando] = useState(usuarioId !== null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!usuarioId) return;
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      try {
        const { data } = await api.get<FavoritoDto[]>(`/usuarios/${usuarioId}/favoritos`);
        if (!cancelado) setFavoritos(data);
      } catch {
        /* mantém os favoritos atuais em caso de falha */
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const isFavorito = useCallback(
    (subprefeituraId: string) => favoritos.some((f) => f.subprefeituraId === subprefeituraId),
    [favoritos]
  );

  const toggleFavorito = useCallback(
    async (subprefeituraId: string) => {
      if (!usuarioId) return;
      try {
        if (isFavorito(subprefeituraId)) {
          await api.delete(`/usuarios/${usuarioId}/favoritos/${subprefeituraId}`);
          setFavoritos((prev) => prev.filter((f) => f.subprefeituraId !== subprefeituraId));
          showToast('Subprefeitura removida dos favoritos', 'info');
        } else {
          const { data } = await api.post<FavoritoDto>(`/usuarios/${usuarioId}/favoritos`, { subprefeituraId });
          setFavoritos((prev) => [...prev, data]);
          track.favoritouRegiao(subprefeituraId);
          showToast('Subprefeitura adicionada aos favoritos', 'success');
        }
      } catch (err) {
        // O limite de 10 volta como 400 com mensagem pronta; mostra a da API quando houver.
        const mensagem = (err as { response?: { data?: { mensagem?: string } } }).response?.data?.mensagem;
        showToast(mensagem ?? 'Não foi possível atualizar favoritos', 'error');
      }
    },
    [usuarioId, isFavorito, showToast]
  );

  // Onboarding: salva a lista final de uma vez, sem um toast por item (a tela dá o retorno).
  const adicionarVarios = useCallback(
    async (ids: string[]) => {
      if (!usuarioId) return false;
      const novos: FavoritoDto[] = [];
      try {
        for (const id of ids) {
          if (favoritos.some((f) => f.subprefeituraId === id)) continue;
          const { data } = await api.post<FavoritoDto>(`/usuarios/${usuarioId}/favoritos`, { subprefeituraId: id });
          novos.push(data);
          track.favoritouRegiao(id);
        }
        return true;
      } catch {
        return false;
      } finally {
        if (novos.length > 0) setFavoritos((prev) => [...prev, ...novos]);
      }
    },
    [usuarioId, favoritos]
  );

  return { favoritos, isFavorito, toggleFavorito, adicionarVarios, carregando };
}
