// Carregamento e tipos mínimos do Google Identity Services (GSI), usados no
// login com Google. O script é carregado sob demanda (só quando há Client ID).

export interface CredentialResponse {
  /** ID token (JWT) do Google — enviado ao backend para validação. */
  credential: string;
  select_by?: string;
}

interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GsiButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfig) => void;
  prompt: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';
let promessa: Promise<void> | null = null;

/** Carrega o script do GSI uma única vez. Resolve quando `window.google` existe. */
export function carregarGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (promessa) return promessa;

  promessa = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      promessa = null;
      reject(new Error('Falha ao carregar o Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return promessa;
}
