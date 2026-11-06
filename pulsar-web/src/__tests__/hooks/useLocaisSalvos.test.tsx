import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LocalSalvoDto } from '../../types';

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../api/client', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const recarregar = vi.fn();
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ recarregar }) }));
const analyticsMock = vi.hoisted(() => ({ salvouLocal: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { salvouLocal: analyticsMock.salvouLocal } }));

import api from '../../api/client';
import { useLocaisSalvos } from '../../hooks/useLocaisSalvos';

const m = api as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
const casa: LocalSalvoDto = { tipo: 'CASA', latitude: 1, longitude: 2, rotulo: 'Rua A', subprefeituraId: 'm', subprefeituraNome: 'Mooca' };
const ponto = { lat: 1, lon: 2, rotulo: 'Rua A', fonte: 'endereco' as const };

beforeEach(() => {
  vi.clearAllMocks();
  m.get.mockResolvedValue({ data: [casa] });
});

describe('useLocaisSalvos', () => {
  it('carrega e indexa por tipo', async () => {
    const { result } = renderHook(() => useLocaisSalvos('u1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.locais.CASA).toEqual(casa);
    expect(result.current.locais.TRABALHO).toBeUndefined();
  });

  it('TETO avisa e não recarrega favoritas', async () => {
    m.put.mockResolvedValue({ data: { local: casa, favorita: 'TETO' } });
    const { result } = renderHook(() => useLocaisSalvos('u1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    let ok = false;
    await act(async () => { ok = await result.current.salvar('CASA', ponto, 'm', 'rota'); });
    expect(ok).toBe(true);
    expect(showToast).toHaveBeenCalledWith('Casa salva. A região não entrou nas favoritas porque você já acompanha 10.', 'success');
    expect(recarregar).not.toHaveBeenCalled();
    expect(analyticsMock.salvouLocal).toHaveBeenCalledWith('casa', 'rota');
  });

  it('ADICIONADA recarrega favoritas', async () => {
    m.put.mockResolvedValue({ data: { local: { ...casa, tipo: 'TRABALHO' }, favorita: 'ADICIONADA' } });
    const { result } = renderHook(() => useLocaisSalvos('u1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => { await result.current.salvar('TRABALHO', ponto, 'm', 'configuracoes'); });
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Trabalho salvo', 'success');
    expect(result.current.locais.TRABALHO).toBeDefined();
  });

  it('erro 400 mostra a mensagem da API', async () => {
    m.put.mockRejectedValue({ response: { data: { mensagem: 'Fora de SP.' } } });
    const { result } = renderHook(() => useLocaisSalvos('u1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    let ok = true;
    await act(async () => { ok = await result.current.salvar('CASA', ponto, 'm', 'rota'); });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Fora de SP.', 'error');
  });

  it('apagar remove do estado', async () => {
    m.delete.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useLocaisSalvos('u1'));
    await waitFor(() => expect(result.current.locais.CASA).toBeDefined());
    await act(async () => { await result.current.apagar('CASA'); });
    expect(result.current.locais.CASA).toBeUndefined();
    expect(showToast).toHaveBeenCalledWith('Casa apagada', 'info');
  });
});
