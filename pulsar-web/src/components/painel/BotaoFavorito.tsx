import { Star } from 'lucide-react';

interface Props {
  ativo: boolean;
  onToggle: () => void;
  size?: number;
}

/** Estrela de favorito das subprefeituras (DetalheSubprefeitura). */
export default function BotaoFavorito({ ativo, onToggle, size = 18 }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] active:scale-95"
      title={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-label={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={ativo}
    >
      {/* Azul do Pulsar (--text-accent, que já muda com o tema), preenchida quando ativa. */}
      <Star
        size={size}
        fill={ativo ? 'currentColor' : 'none'}
        style={{ color: ativo ? 'var(--text-accent)' : 'var(--text-secondary)' }}
        className="transition-colors"
      />
    </button>
  );
}
