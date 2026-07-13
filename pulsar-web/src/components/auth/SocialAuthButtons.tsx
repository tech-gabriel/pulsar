import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useDestinoPosAuth } from '../../hooks/useDestinoPosAuth';
import { carregarGsi, type CredentialResponse } from '../../utils/gsi';

/**
 * Login social. Hoje só Google, via Google Identity Services (botão oficial).
 *
 * Gated por configuração: sem `VITE_GOOGLE_CLIENT_ID` o componente não renderiza
 * nada (e o backend recusa `/auth/google`). O mesmo Client ID deve estar no
 * backend em `Authentication:Google:ClientId`.
 *
 * Apple/Facebook ficaram de fora por ora (exigem conta paga/app review).
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface Props {
  /** Verbo da ação para o rótulo: "Entrar" | "Cadastrar". */
  acao: string;
}

export default function SocialAuthButtons({ acao }: Props) {
  const { loginGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const destino = useDestinoPosAuth();
  const botaoRef = useRef<HTMLDivElement>(null);
  const onCredential = useRef<(r: CredentialResponse) => void>(() => {});

  // Mantém o handler do callback sempre atualizado, sem reinicializar o GSI.
  useEffect(() => {
    onCredential.current = async (resp: CredentialResponse) => {
      try {
        await loginGoogle(resp.credential);
        navigate(destino);
      } catch {
        showToast('Não foi possível entrar com o Google. Tente novamente.', 'error');
      }
    };
  }, [loginGoogle, navigate, destino, showToast]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelado = false;

    carregarGsi()
      .then(() => {
        if (cancelado || !window.google || !botaoRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID!,
          callback: (resp) => onCredential.current(resp),
        });
        window.google.accounts.id.renderButton(botaoRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: acao === 'Cadastrar' ? 'signup_with' : 'signin_with',
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelado) showToast('Login com Google indisponível no momento.', 'error');
      });

    return () => {
      cancelado = true;
    };
  }, [acao, showToast]);

  // Sem Client ID configurado: nada de login social (evita botão sem função).
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="auth-divider">ou {acao.toLowerCase()} com</div>
      <div ref={botaoRef} className="flex justify-center" />
    </div>
  );
}
