import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import type { NotificacoesPrefs } from './useNotificacoesPrefs';

/**
 * Estado do push neste navegador:
 * - `carregando`: verificando suporte/servidor;
 * - `indisponivel`: navegador sem suporte ou push desligado no servidor;
 * - `negado`: usuário bloqueou a permissão de notificação;
 * - `inativo`: suportado, mas sem inscrição;
 * - `ativo`: inscrito e enviando ao servidor.
 */
export type EstadoPush = 'carregando' | 'indisponivel' | 'negado' | 'inativo' | 'ativo';

interface VapidResposta {
  habilitado: boolean;
  chavePublica: string | null;
}

function suportaPush(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Converte a chave VAPID (Base64 URL-safe) no formato exigido por `subscribe`. */
function urlBase64ParaUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalizado = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(normalizado);
  // Backing ArrayBuffer explícito: applicationServerKey exige BufferSource
  // baseado em ArrayBuffer (não SharedArrayBuffer) nos tipos recentes do TS.
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

/**
 * Gerencia a inscrição de Web Push do dispositivo: descobre suporte/estado,
 * permite ativar/desativar e mantém as preferências sincronizadas com o backend.
 */
export function usePushSubscription(prefs: NotificacoesPrefs) {
  const [estado, setEstado] = useState<EstadoPush>('carregando');
  const [ocupado, setOcupado] = useState(false);
  const chaveRef = useRef<string | null>(null);
  // Mantém as prefs atuais acessíveis dentro dos callbacks sem recriá-los.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const enviarAoBackend = useCallback(async (sub: PushSubscription) => {
    const json = sub.toJSON();
    const p = prefsRef.current;
    await api.post('/notificacoes/subscriptions', {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      alertaModerado: p.alertaModerado,
      alertaAlto: p.alertaAlto,
      resumoDiario: p.resumoDiario,
    });
  }, []);

  // Descoberta inicial: suporte → permissão → servidor habilitado → inscrição existente.
  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!suportaPush()) {
        setEstado('indisponivel');
        return;
      }
      if (Notification.permission === 'denied') {
        setEstado('negado');
        return;
      }
      try {
        const { data } = await api.get<VapidResposta>('/notificacoes/vapid-public-key');
        if (cancelado) return;
        if (!data.habilitado || !data.chavePublica) {
          setEstado('indisponivel');
          return;
        }
        chaveRef.current = data.chavePublica;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelado) setEstado(sub ? 'ativo' : 'inativo');
      } catch {
        if (!cancelado) setEstado('indisponivel');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const ativar = useCallback(async () => {
    if (!suportaPush() || !chaveRef.current) return;
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'negado' : 'inativo');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ParaUint8Array(chaveRef.current),
        }));
      await enviarAoBackend(sub);
      setEstado('ativo');
    } catch {
      setEstado('inativo');
    } finally {
      setOcupado(false);
    }
  }, [enviarAoBackend]);

  const desativar = useCallback(async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/notificacoes/subscriptions', {
          params: { endpoint: sub.endpoint },
        });
        await sub.unsubscribe();
      }
      setEstado('inativo');
    } catch {
      /* mantém o estado atual em caso de falha */
    } finally {
      setOcupado(false);
    }
  }, []);

  // Reenvia as preferências ao backend sempre que mudarem com inscrição ativa.
  useEffect(() => {
    if (estado !== 'ativo') return;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await enviarAoBackend(sub);
      } catch {
        /* silencioso: a próxima ativação reenvia */
      }
    })();
  }, [prefs, estado, enviarAoBackend]);

  return { estado, ocupado, ativar, desativar };
}
