import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../../contexts/ToastContext';

const config: Record<ToastType, { icon: typeof Info; border: string; icon_color: string }> = {
  success: { icon: CheckCircle, border: 'rgba(34, 197, 94, 0.4)',  icon_color: 'text-emerald-400' },
  error:   { icon: XCircle,     border: 'rgba(239, 68, 68, 0.4)',  icon_color: 'text-red-400'     },
  info:    { icon: Info,        border: 'rgba(0, 188, 255, 0.35)', icon_color: 'text-pulsar-300'  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const { icon: Icon, border, icon_color } = config[toast.type];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl max-w-sm w-full animate-slide-up"
      style={{
        background: 'rgba(5, 47, 74, 0.9)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: `1px solid ${border}`,
        boxShadow: 'var(--glass-shadow)',
      }}
      role="alert"
    >
      <Icon size={18} className={`${icon_color} shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm font-medium text-pulsar-50">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-pulsar-300 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
