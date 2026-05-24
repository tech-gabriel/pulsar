import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../../contexts/ToastContext';

const config: Record<ToastType, { icon: typeof Info; bg: string; text: string; border: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  error:   { icon: XCircle,     bg: 'bg-red-50',     text: 'text-red-800',     border: 'border-red-200'     },
  info:    { icon: Info,        bg: 'bg-pulsar-50',  text: 'text-pulsar-800',  border: 'border-pulsar-200'  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const { icon: Icon, bg, text, border } = config[toast.type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md max-w-sm w-full ${bg} ${border} animate-slide-up`}
      role="alert"
    >
      <Icon size={18} className={`${text} shrink-0 mt-0.5`} />
      <p className={`flex-1 text-sm font-medium ${text}`}>{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className={`${text} opacity-60 hover:opacity-100 transition-opacity`}
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
