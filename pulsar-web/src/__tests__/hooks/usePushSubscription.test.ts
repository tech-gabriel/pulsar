import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const analyticsMock = vi.hoisted(() => ({ ativouPush: vi.fn() }));
vi.mock('../../analytics', () => ({ track: { ativouPush: analyticsMock.ativouPush } }));

import api from '../../api/client';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import type { NotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const prefs: NotificacoesPrefs = { alertaModerado: false, alertaAlto: true, resumoDiario: false };

const getSubscription = vi.fn();
const subscribe = vi.fn();
const requestPermission = vi.fn();

const assinaturaFalsa = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ keys: { p256dh: 'CHAVE_P256', auth: 'CHAVE_AUTH' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

function instalarSuportePush() {
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  });
  (window as unknown as { PushManager: unknown }).PushManager = function () {};
  (window as unknown as { Notification: unknown }).Notification = {
    permission: 'default',
    requestPermission,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  instalarSuportePush();
  getSubscription.mockResolvedValue(null);
  requestPermission.mockResolvedValue('granted');
  subscribe.mockResolvedValue(assinaturaFalsa);
  mockedApi.get.mockResolvedValue({ data: { habilitado: true, chavePublica: 'BNbxGYNMhEIi' } });
  mockedApi.post.mockResolvedValue({ data: {} });
  mockedApi.delete.mockResolvedValue({ data: {} });
});

describe('usePushSubscription', () => {
  it('fica inativo quando suportado, servidor habilitado e sem inscrição', async () => {
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('inativo'));
    expect(mockedApi.get).toHaveBeenCalledWith('/notificacoes/vapid-public-key');
  });

  it('fica indisponível quando o servidor está com push desligado', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { habilitado: false, chavePublica: null } });
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('indisponivel'));
  });

  it('ativar() pede permissão, inscreve e envia a inscrição ao backend', async () => {
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('inativo'));

    await act(async () => { await result.current.ativar(); });

    expect(requestPermission).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalled();
    expect(mockedApi.post).toHaveBeenCalledWith('/notificacoes/subscriptions', expect.objectContaining({
      endpoint: 'https://push.example/abc',
      p256dh: 'CHAVE_P256',
      auth: 'CHAVE_AUTH',
      alertaAlto: true,
    }));
    expect(result.current.estado).toBe('ativo');
  });

  it('emite ativou_push quando a inscrição é criada com sucesso', async () => {
    analyticsMock.ativouPush.mockClear();
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('inativo'));

    await act(async () => { await result.current.ativar(); });

    await waitFor(() => expect(result.current.estado).toBe('ativo'));
    expect(analyticsMock.ativouPush).toHaveBeenCalledTimes(1);
  });

  it('ativar() com permissão negada marca estado negado e não envia', async () => {
    requestPermission.mockResolvedValueOnce('denied');
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('inativo'));

    await act(async () => { await result.current.ativar(); });

    expect(result.current.estado).toBe('negado');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('detecta inscrição presa a chave VAPID antiga e a refaz ao ativar', async () => {
    const subAntiga = {
      endpoint: 'https://push.example/antiga',
      options: { applicationServerKey: new Uint8Array([9, 9, 9]).buffer },
      toJSON: () => ({ keys: { p256dh: 'X', auth: 'Y' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    // Inscrição existente, mas com chave diferente da que o servidor devolve.
    getSubscription.mockResolvedValue(subAntiga);

    const { result } = renderHook(() => usePushSubscription(prefs));
    // Chave divergente → tratado como inativo (botão "Ativar" reaparece).
    await waitFor(() => expect(result.current.estado).toBe('inativo'));

    await act(async () => { await result.current.ativar(); });

    expect(subAntiga.unsubscribe).toHaveBeenCalled(); // descartou a antiga
    expect(subscribe).toHaveBeenCalled();              // refez com a chave atual
    expect(mockedApi.post).toHaveBeenCalled();
    expect(result.current.estado).toBe('ativo');
  });

  it('desativar() remove a inscrição no backend e no navegador', async () => {
    getSubscription.mockResolvedValue(assinaturaFalsa);
    const { result } = renderHook(() => usePushSubscription(prefs));
    await waitFor(() => expect(result.current.estado).toBe('ativo'));

    await act(async () => { await result.current.desativar(); });

    expect(mockedApi.delete).toHaveBeenCalledWith('/notificacoes/subscriptions', {
      params: { endpoint: 'https://push.example/abc' },
    });
    expect(assinaturaFalsa.unsubscribe).toHaveBeenCalled();
    expect(result.current.estado).toBe('inativo');
  });
});
