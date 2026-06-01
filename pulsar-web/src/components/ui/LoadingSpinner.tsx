import { Activity } from 'lucide-react';

interface Props {
  mensagem?: string;
  className?: string;
  fullscreen?: boolean;
}

/**
 * Spinner de carregamento dark (ETAPA 5.6).
 * `fullscreen` exibe um overlay glass com ícone Activity girando.
 */
export default function LoadingSpinner({ mensagem = 'Carregando...', className = '', fullscreen = false }: Props) {
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-4"
        style={{ background: 'rgba(5, 47, 74, 0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        <Activity size={32} className="text-pulsar-400 animate-spin" />
        <p className="text-pulsar-200 text-sm">{mensagem}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="w-8 h-8 border-3 border-pulsar-800 border-t-pulsar-400 rounded-full animate-spin" />
      <p className="text-sm text-pulsar-200">{mensagem}</p>
    </div>
  );
}
