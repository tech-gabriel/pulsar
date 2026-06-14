import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { SalvarSugestaoRequest, SugestaoAdminDto } from '../types';
import { useToast } from '../contexts/ToastContext';

interface UseSugestoesAdminResult {
  sugestoes: SugestaoAdminDto[];
  carregando: boolean;
  erro: boolean;
  criar: (req: SalvarSugestaoRequest) => Promise<boolean>;
  atualizar: (id: string, req: SalvarSugestaoRequest) => Promise<boolean>;
  remover: (id: string) => Promise<void>;
  recarregar: () => void;
}

/** Carrega e gerencia o catálogo de sugestões para moderação. */
export function useSugestoesAdmin(): UseSugestoesAdminResult {
  const [sugestoes, setSugestoes] = useState<SugestaoAdminDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [versao, setVersao] = useState(0);
  const { showToast } = useToast();

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(false);
      try {
        const { data } = await api.get<SugestaoAdminDto[]>('/admin/sugestoes');
        if (!cancelado) setSugestoes(data);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [versao]);

  const criar = useCallback(
    async (req: SalvarSugestaoRequest): Promise<boolean> => {
      try {
        const { data } = await api.post<SugestaoAdminDto>('/admin/sugestoes', req);
        setSugestoes((prev) => [data, ...prev]);
        showToast('Sugestão criada', 'success');
        return true;
      } catch (e) {
        showToast(extrairMensagem(e) ?? 'Não foi possível criar a sugestão', 'error');
        return false;
      }
    },
    [showToast]
  );

  const atualizar = useCallback(
    async (id: string, req: SalvarSugestaoRequest): Promise<boolean> => {
      try {
        const { data } = await api.put<SugestaoAdminDto>(`/admin/sugestoes/${id}`, req);
        setSugestoes((prev) => prev.map((s) => (s.id === id ? data : s)));
        showToast('Sugestão atualizada', 'success');
        return true;
      } catch (e) {
        showToast(extrairMensagem(e) ?? 'Não foi possível atualizar a sugestão', 'error');
        return false;
      }
    },
    [showToast]
  );

  const remover = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/admin/sugestoes/${id}`);
        setSugestoes((prev) => prev.filter((s) => s.id !== id));
        showToast('Sugestão excluída', 'info');
      } catch (e) {
        showToast(extrairMensagem(e) ?? 'Não foi possível excluir a sugestão', 'error');
      }
    },
    [showToast]
  );

  return { sugestoes, carregando, erro, criar, atualizar, remover, recarregar };
}

/** Extrai a mensagem de erro do backend (`{ mensagem }`), se houver. */
function extrairMensagem(e: unknown): string | null {
  if (
    typeof e === 'object' &&
    e !== null &&
    'response' in e &&
    typeof (e as { response?: unknown }).response === 'object'
  ) {
    const data = (e as { response?: { data?: { mensagem?: string } } }).response?.data;
    if (data && typeof data.mensagem === 'string') return data.mensagem;
  }
  return null;
}
