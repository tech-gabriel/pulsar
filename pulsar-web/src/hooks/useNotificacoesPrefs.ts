import { useState, useCallback } from 'react';

export interface NotificacoesPrefs {
  /** Avisar quando o risco atingir faixa Moderado (ou acima). */
  alertaModerado: boolean;
  /** Avisar quando o risco atingir faixa Alto. */
  alertaAlto: boolean;
  /** Receber um resumo diário das condições. */
  resumoDiario: boolean;
}

const STORAGE_KEY = 'pulsar-notif-prefs';

const PADRAO: NotificacoesPrefs = {
  alertaModerado: false,
  alertaAlto: true,
  resumoDiario: false,
};

function ler(): NotificacoesPrefs {
  if (typeof window === 'undefined') return PADRAO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...PADRAO, ...JSON.parse(raw) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

/**
 * Preferências de notificação persistidas localmente (ainda sem backend de
 * push). Quando houver um serviço de notificações, estas chaves alimentam o
 * opt-in enviado ao servidor.
 */
export function useNotificacoesPrefs() {
  const [prefs, setPrefs] = useState<NotificacoesPrefs>(ler);

  const toggle = useCallback((chave: keyof NotificacoesPrefs) => {
    setPrefs((atual) => {
      const novo = { ...atual, [chave]: !atual[chave] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      } catch {
        /* ignora cota/cache indisponível */
      }
      return novo;
    });
  }, []);

  return { prefs, toggle };
}
