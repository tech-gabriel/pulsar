import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { LocalSalvoDto, SalvarLocalResponse, TipoLocal } from '../types';
import type { PontoRota } from '../features/rota/tipos';
import { ROTULO_TIPO } from '../features/locais/regras';
import { useToast } from '../contexts/ToastContext';
import { useFavoritos } from './useFavoritos';
import { track } from '../analytics';

type Origem = 'rota' | 'configuracoes';

const slug = (tipo: TipoLocal) => tipo.toLowerCase();
const mensagemDaApi = (err: unknown) => (err as { response?: { data?: { mensagem?: string } } }).response?.data?.mensagem;

/** Casa e trabalho da conta. Precisa estar dentro do FavoritosProvider (salvar pode adicionar favorita). */
export function useLocaisSalvos(usuarioId: string | null) {
  const [locais, setLocais] = useState<Partial<Record<TipoLocal, LocalSalvoDto>>>({});
  const [carregando, setCarregando] = useState(usuarioId !== null);
  const { showToast } = useToast();
  const { recarregar } = useFavoritos();

  useEffect(() => {
    if (!usuarioId) return;
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      try {
        const { data } = await api.get<LocalSalvoDto[]>(`/usuarios/${usuarioId}/locais`);
        if (!cancelado) setLocais(Object.fromEntries(data.map((l) => [l.tipo, l])));
      } catch {
        /* sem locais: a tela segue sem os atalhos */
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const salvar = useCallback(
    async (tipo: TipoLocal, p: PontoRota, subprefeituraId: string, origem: Origem) => {
      if (!usuarioId) return false;
      try {
        const { data } = await api.put<SalvarLocalResponse>(`/usuarios/${usuarioId}/locais/${slug(tipo)}`, {
          latitude: p.lat,
          longitude: p.lon,
          rotulo: p.rotulo,
          subprefeituraId,
        });
        setLocais((prev) => ({ ...prev, [tipo]: data.local }));
        if (data.favorita === 'ADICIONADA') await recarregar();
        const nome = ROTULO_TIPO[tipo];
        const salvo = tipo === 'CASA' ? `${nome} salva` : `${nome} salvo`;
        showToast(
          data.favorita === 'TETO' ? `${salvo}. A região não entrou nas favoritas porque você já acompanha 10.` : salvo,
          'success',
        );
        track.salvouLocal(slug(tipo) as 'casa' | 'trabalho', origem);
        return true;
      } catch (err) {
        showToast(mensagemDaApi(err) ?? 'Não foi possível salvar agora.', 'error');
        return false;
      }
    },
    [usuarioId, recarregar, showToast],
  );

  const apagar = useCallback(
    async (tipo: TipoLocal) => {
      if (!usuarioId) return false;
      try {
        await api.delete(`/usuarios/${usuarioId}/locais/${slug(tipo)}`);
        setLocais((prev) => ({ ...prev, [tipo]: undefined }));
        const nome = ROTULO_TIPO[tipo];
        showToast(tipo === 'CASA' ? `${nome} apagada` : `${nome} apagado`, 'info');
        return true;
      } catch (err) {
        showToast(mensagemDaApi(err) ?? 'Não foi possível apagar agora.', 'error');
        return false;
      }
    },
    [usuarioId, showToast],
  );

  return { locais, carregando, salvar, apagar };
}
