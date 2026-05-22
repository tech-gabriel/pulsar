interface Props {
  mensagem?: string;
  className?: string;
}

export default function LoadingSpinner({ mensagem = 'Carregando...', className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="w-8 h-8 border-3 border-pulsar-200 border-t-pulsar-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{mensagem}</p>
    </div>
  );
}
