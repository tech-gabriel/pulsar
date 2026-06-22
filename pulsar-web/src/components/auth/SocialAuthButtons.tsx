import type { FC } from 'react';
import { useToast } from '../../contexts/ToastContext';

/**
 * Botões de login social (Google / Apple / Facebook).
 *
 * ⚠️ Fiação pendente: o clique é um stub que apenas avisa "em breve" via toast.
 * Quando houver credenciais OAuth, basta trocar o handler `onSelect` por uma
 * chamada ao fluxo real (ex.: redirect para o provedor ou SDK + POST no backend
 * que valida o token e devolve o JWT do Pulsar).
 */

const GoogleIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.81 1.3 10.37.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.72-1.04-2.75-4.13zM14.5 4.5c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z" />
  </svg>
);

const FacebookIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z" />
  </svg>
);

const PROVIDERS: { name: string; Icon: FC }[] = [
  { name: 'Google', Icon: GoogleIcon },
  { name: 'Apple', Icon: AppleIcon },
  { name: 'Facebook', Icon: FacebookIcon },
];

interface Props {
  /** Verbo da ação para o rótulo: "Entrar" | "Cadastrar". */
  acao: string;
}

export default function SocialAuthButtons({ acao }: Props) {
  const { showToast } = useToast();

  function handleSelect(provider: string) {
    // TODO: trocar pelo fluxo OAuth real quando houver credenciais.
    showToast(`Login com ${provider} está chegando! Por enquanto, entre com seu e-mail.`, 'info');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="auth-divider">ou {acao.toLowerCase()} com</div>
      <div className="flex gap-3">
        {PROVIDERS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            className="social-btn"
            onClick={() => handleSelect(name)}
            aria-label={`${acao} com ${name}`}
            title={`${acao} com ${name}`}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
