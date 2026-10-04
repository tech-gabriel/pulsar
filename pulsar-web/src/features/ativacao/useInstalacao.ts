import { useCallback, useEffect, useReducer } from 'react';
import { track } from '../../analytics';
import { detectarInstalacao, plataformaDe, type Plataforma, type SinaisInstalacao } from './instalacao';
import type { Instalacao } from './passos';

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// O navegador dispara beforeinstallprompt logo que a página abre, antes de a pessoa chegar
// à tela de instalar. Por isso guardamos desde o carregamento (main.tsx) e usamos sob demanda.
let promptGuardado: EventoInstalacao | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function capturarPromptDeInstalacao(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptGuardado = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    promptGuardado = null;
    avisar();
  });
}

export function estaInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function sinais(): SinaisInstalacao {
  return {
    userAgent: navigator.userAgent,
    plataforma: navigator.platform ?? '',
    toquesMax: navigator.maxTouchPoints ?? 0,
    standalone: estaInstalado(),
    temPrompt: promptGuardado !== null,
  };
}

/** Adaptador web da instalação. No app nativo, troca-se só este arquivo. */
export function useInstalacao(): { instalacao: Instalacao; plataforma: Plataforma; instalar: () => Promise<boolean> } {
  const [, forcar] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    ouvintes.add(forcar);
    return () => {
      ouvintes.delete(forcar);
    };
  }, []);

  const instalar = useCallback(async () => {
    const ev = promptGuardado;
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    // O evento só pode ser usado uma vez, aceito ou não.
    promptGuardado = null;
    avisar();
    if (outcome !== 'accepted') return false;
    track.instalouApp(plataformaDe(sinais()));
    return true;
  }, []);

  const s = sinais();
  return { instalacao: detectarInstalacao(s), plataforma: plataformaDe(s), instalar };
}
