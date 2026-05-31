import { Star } from 'lucide-react';

interface Props {
  ativo: boolean;
  onToggle: () => void;
  size?: number;
}

/** Estrela de favorito reutilizada no RegiaoCard e no DetalheRegiao. */
export default function BotaoFavorito({ ativo, onToggle, size = 18 }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 rounded-md transition-colors hover:bg-white/5 active:scale-95"
      title={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-label={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={ativo}
    >
      <Star
        size={size}
        className={
          ativo
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-pulsar-300 hover:text-yellow-400 transition-colors'
        }
      />
    </button>
  );
}
