import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  mensagem: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ mensagem, onRetry }: Props) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{mensagem}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-red-700 hover:text-red-900 font-medium transition-colors"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
