import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  mensagem: string;
  onRetry?: () => void;
}

/** Card de erro dark glass com botão de retry (ETAPA 5.6). */
export default function ErrorBanner({ mensagem, onRetry }: Props) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <AlertCircle size={20} className="shrink-0 text-red-400" />
      <span className="flex-1 text-pulsar-50">{mensagem}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-pulsar-400 text-pulsar-200 hover:bg-pulsar-600 hover:text-white px-3 py-1.5 font-medium transition-colors"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
