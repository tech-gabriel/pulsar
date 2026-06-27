import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { RoleAcesso, UsuarioAdminDto } from '../types';
import { useToast } from '../contexts/ToastContext';

interface UseUsuariosAdminResult {
  usuarios: UsuarioAdminDto[];
  carregando: boolean;
  erro: boolean;
  alterarRole: (id: string, role: RoleAcesso) => Promise<void>;
  alterarAtivo: (id: string, ativo: boolean) => Promise<void>;
  excluir: (id: string) => Promise<void>;
  recarregar: () => void;
}

/** Carrega e gerencia a lista de usuários para a área administrativa. */
export function useUsuariosAdmin(): UseUsuariosAdminResult {
  const [usuarios, setUsuarios] = useState<UsuarioAdminDto[]>([]);
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
        const { data } = await api.get<UsuarioAdminDto[]>('/admin/usuarios');
        if (!cancelado) setUsuarios(data);
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

  const alterarRole = useCallback(
    async (id: string, role: RoleAcesso) => {
      try {
        const { data } = await api.put<UsuarioAdminDto>(`/admin/usuarios/${id}/role`, { role });
        setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u)));
        showToast('Role atualizada', 'success');
      } catch (e) {
        const msg = extrairMensagem(e) ?? 'Não foi possível alterar a role';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  const alterarAtivo = useCallback(
    async (id: string, ativo: boolean) => {
      try {
        const { data } = await api.put<UsuarioAdminDto>(`/admin/usuarios/${id}/ativo`, { ativo });
        setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u)));
        showToast(ativo ? 'Conta ativada' : 'Conta desativada', 'success');
      } catch (e) {
        const msg = extrairMensagem(e) ?? 'Não foi possível alterar o status';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  const excluir = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/admin/usuarios/${id}`);
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        showToast('Conta excluída', 'success');
      } catch (e) {
        const msg = extrairMensagem(e) ?? 'Não foi possível excluir a conta';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  return { usuarios, carregando, erro, alterarRole, alterarAtivo, excluir, recarregar };
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
