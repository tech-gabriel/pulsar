import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

/**
 * Pedido de confirmação do e-mail (SEC1, opção D aprovada em 13/10): aparece uma vez no fim das
 * boas-vindas, quando a pessoa acabou de configurar o app, e depois fica só no topo de Configurações.
 * Nunca flutua sobre o mapa. Só existe com `emailVerificado === false`: sessão gravada antes do SEC1
 * não tem o campo e é de conta já verificada.
 */
const TEXTOS = {
  'boas-vindas': {
    titulo: 'Último passo: confirme seu e-mail',
    antes: 'Enviamos um link para ',
    depois: '. É ele que garante que só você recupera a conta.',
    botao: 'Não chegou? Reenviar',
  },
  configuracoes: {
    titulo: 'Confirme seu e-mail',
    antes: 'Falta um passo para proteger sua conta. O link foi para ',
    depois: '.',
    botao: 'Reenviar e-mail',
  },
} as const;

interface Props {
  variante: keyof typeof TEXTOS;
  className?: string;
}

export default function CartaoConfirmarEmail({ variante, className = '' }: Props) {
  const { usuario, recarregarUsuario, reenviarConfirmacao } = useAuth();
  const { showToast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const pendente = usuario?.emailVerificado === false;

  // A confirmação pode ter acontecido em outro aparelho: a cópia local envelhece.
  useEffect(() => {
    if (pendente) recarregarUsuario().catch(() => {});
  }, [pendente, recarregarUsuario]);

  if (!pendente || !usuario) return null;
  const email = usuario.email;
  const t = TEXTOS[variante];

  async function reenviar() {
    setEnviando(true);
    try {
      await reenviarConfirmacao();
      showToast(`Enviamos um novo link para ${email}.`, 'success');
    } catch {
      showToast('Não foi possível reenviar agora. Tente de novo em instantes.', 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section
      className={`rounded-2xl px-4 py-4 text-left ${className}`}
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid color-mix(in srgb, var(--text-accent) 40%, transparent)',
      }}
      aria-labelledby={`confirmar-email-${variante}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
          style={{ background: 'rgba(0, 188, 255, 0.12)', color: 'var(--text-accent)' }}
        >
          <Mail size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id={`confirmar-email-${variante}`}
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}
          >
            {t.titulo}
          </h2>
          <p className="mt-1" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
            {t.antes}<strong className="break-words" style={{ color: 'var(--text-primary)' }}>{email}</strong>{t.depois}
          </p>
          <button
            type="button"
            onClick={reenviar}
            disabled={enviando}
            className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-70"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-accent)' }}
          >
            {enviando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {enviando ? 'Enviando…' : t.botao}
          </button>
        </div>
      </div>
    </section>
  );
}
