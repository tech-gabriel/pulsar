import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pulsar-onboarding-visto';

function jaViu(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // localStorage indisponível: não incomoda o usuário
  }
}

/**
 * Controla o onboarding de boas-vindas (mostrado só na 1ª visita).
 * - `aberto`: verdadeiro quando o usuário ainda não viu (inicializado no mount).
 * - `concluir`: marca como visto e fecha.
 * - `reverNovamente`: limpa a marca para a tela poder reexibir (usado em Configurações).
 */
export function useOnboarding() {
  const [aberto, setAberto] = useState<boolean>(() => !jaViu());

  const concluir = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignora cota/cache indisponível */
    }
    setAberto(false);
  }, []);

  const reverNovamente = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
  }, []);

  return { aberto, concluir, reverNovamente };
}
