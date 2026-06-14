import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UsuarioAdminDto } from '../../types';

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from '../../api/client';
import { useUsuariosAdmin } from '../../hooks/useUsuariosAdmin';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

const usuario = (over: Partial<UsuarioAdminDto> = {}): UsuarioAdminDto => ({
  id: 'u1',
  nome: 'Alice',
  email: 'alice@test.com',
  perfil: 'CIDADAO',
  role: 'USUARIO',
  ativo: true,
  criadoEm: '2026-06-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: [usuario()] });
  mockedApi.put.mockResolvedValue({ data: usuario() });
});

describe('useUsuariosAdmin', () => {
  it('carrega a lista de usuários ao montar', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [usuario(), usuario({ id: 'u2', nome: 'Bob' })] });
    const { result } = renderHook(() => useUsuariosAdmin());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/usuarios');
    expect(result.current.usuarios).toHaveLength(2);
    expect(result.current.erro).toBe(false);
  });

  it('marca erro quando a carga falha', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('rede'));
    const { result } = renderHook(() => useUsuariosAdmin());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBe(true);
  });

  it('alterarRole atualiza o usuário na lista e notifica', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: usuario({ role: 'SUPORTE' }) });
    const { result } = renderHook(() => useUsuariosAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.alterarRole('u1', 'SUPORTE'); });

    expect(mockedApi.put).toHaveBeenCalledWith('/admin/usuarios/u1/role', { role: 'SUPORTE' });
    expect(result.current.usuarios.find((u) => u.id === 'u1')?.role).toBe('SUPORTE');
    expect(showToast).toHaveBeenCalledWith('Role atualizada', 'success');
  });

  it('exibe a mensagem do backend quando a alteração falha', async () => {
    mockedApi.put.mockRejectedValueOnce({ response: { data: { mensagem: 'Você não pode alterar a própria role.' } } });
    const { result } = renderHook(() => useUsuariosAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.alterarRole('u1', 'USUARIO'); });

    expect(showToast).toHaveBeenCalledWith('Você não pode alterar a própria role.', 'error');
  });

  it('alterarAtivo atualiza o status e notifica', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: usuario({ ativo: false }) });
    const { result } = renderHook(() => useUsuariosAdmin());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => { await result.current.alterarAtivo('u1', false); });

    expect(mockedApi.put).toHaveBeenCalledWith('/admin/usuarios/u1/ativo', { ativo: false });
    expect(result.current.usuarios.find((u) => u.id === 'u1')?.ativo).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Conta desativada', 'success');
  });
});
