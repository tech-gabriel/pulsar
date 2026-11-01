import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useToast, type Toast, type ToastType } from '../../contexts/ToastContext';
import { subirSuave } from '../../motion/presets';

// O fundo é a superfície do tema (branca no claro): texto e ícone saem de tokens ou de tons
// que passam 3:1 nos dois fundos. Antes o texto era quase branco fixo e sumia no tema claro.
const config: Record<ToastType, { icon: typeof Info; border: string; cor: string }> = {
  success: { icon: CheckCircle, border: 'rgba(34, 197, 94, 0.4)',  cor: '#16A34A' },
  error:   { icon: XCircle,     border: 'rgba(239, 68, 68, 0.4)',  cor: '#DC2626' },
  info:    { icon: Info,        border: 'rgba(0, 188, 255, 0.35)', cor: 'var(--text-accent)' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const { icon: Icon, border, cor } = config[toast.type];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl max-w-sm w-full"
      style={{
        background: 'var(--superficie)',
        border: `1px solid ${border}`,
        boxShadow: 'var(--glass-shadow)',
      }}
      role="alert"
    >
      <Icon size={18} className="shrink-0 mt-0.5" style={{ color: cor }} />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-[calc(1.5rem+var(--seguro-baixo))] left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            variants={subirSuave}
            initial="inicial"
            animate="animar"
            exit="sair"
            className="pointer-events-auto"
          >
            <ToastItem toast={t} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
