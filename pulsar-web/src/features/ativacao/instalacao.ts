import type { Instalacao } from './passos';

/** Os sinais do navegador que decidem a instalação. Puro, para testar sem DOM. */
export interface SinaisInstalacao {
  userAgent: string;
  plataforma: string;
  toquesMax: number;
  standalone: boolean;
  temPrompt: boolean;
}

export type Plataforma = 'ios' | 'android' | 'desktop';

/** iPadOS se apresenta como Mac ("MacIntel"); o que o denuncia é ter toque. */
export function ehIOS(s: SinaisInstalacao): boolean {
  return /iPhone|iPad|iPod/i.test(s.userAgent) || (s.plataforma === 'MacIntel' && s.toquesMax > 1);
}

export function detectarInstalacao(s: SinaisInstalacao): Instalacao {
  if (s.standalone) return 'instalado';
  if (ehIOS(s)) return 'ios-safari';
  if (s.temPrompt) return 'prompt';
  return 'indisponivel';
}

/** Primeira abertura pelo ícone no iPhone/iPad: lá o app não vê a sessão do Safari. */
export function appIOSInstalado(s: SinaisInstalacao): boolean {
  return s.standalone && ehIOS(s);
}

export function plataformaDe(s: SinaisInstalacao): Plataforma {
  if (ehIOS(s)) return 'ios';
  if (/Android/i.test(s.userAgent)) return 'android';
  return 'desktop';
}
