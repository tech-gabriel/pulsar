import { useEffect, useState } from 'react';
import { Loader2, MailWarning, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import GlassCard from '../ui/GlassCard';

/**
 * Pede a confirmação do e-mail (SEC1). Flutua abaixo do top bar para não empurrar o layout
 * das páginas (o mapa ocupa a tela toda). Só aparece com `emailVerificado === false`:
 * sessão gravada antes do SEC1 não tem o campo e é de conta já verificada.
 */
export default function AvisoConfirmarEmail() {
  const { usuario, recarregarUsuario, reenviarConfirmacao } = useAuth();
  const { showToast } = useToast();
  const [fechado, setFechado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const pendente = usuario?.emailVerificado === false;

  // A confirmação pode ter acontecido em outro aparelho: a cópia local envelhece.
  useEffect(() => {
    if (pendente) recarregarUsuario().catch(() => {});
  }, [pendente, recarregarUsuario]);

  if (!pendente || fechado || !usuario) return null;
  const email = usuario.email;

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
    <div className="fixed z-[999] left-4 right-4 top-14 md:left-auto md:right-6 md:top-[72px] md:max-w-sm" role="status">
      <GlassCard padding="md">
        <div className="flex items-start gap-3">
          <MailWarning size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-accent)' }} />
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              Confirme seu e-mail para proteger sua conta. O link foi para <strong className="break-all">{email}</strong>.
            </p>
            <button
              type="button"
              onClick={reenviar}
              disabled={enviando}
              className="mt-1.5 inline-flex items-center gap-1.5 underline underline-offset-2 min-h-[44px] md:min-h-0 md:py-1 disabled:no-underline disabled:opacity-70"
              style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            >
              {enviando && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {enviando ? 'Enviando…' : 'Reenviar e-mail'}
            </button>
          </div>
          <button type="button" aria-label="Fechar aviso" onClick={() => setFechado(true)} className="acao-header">
            <X size={16} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
