import { Droplets } from 'lucide-react';

interface Props {
  ativo: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

/**
 * Botão flutuante para ligar/desligar o overlay de alagamentos. Fica no canto
 * inferior esquerdo do mapa, acima da tab bar no mobile — longe da busca (topo),
 * do LayerControl (esquerda/centro) e do FAB (canto inferior direito).
 */
export default function OverlayAlagamentoToggle({ ativo, onToggle, isMobile }: Props) {
  const iconSize = isMobile ? 18 : 20;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      aria-label="Alagamentos"
      title="Mostrar alagamentos dos últimos 12 meses"
      className="layer-btn absolute left-3 bottom-6 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: ativo ? 'rgba(0, 132, 209, 0.85)' : 'var(--bg-primary)',
        color: ativo ? 'white' : 'var(--text-secondary)',
        border: '1px solid var(--border-glass)',
        boxShadow: ativo ? '0 0 12px rgba(0, 188, 255, 0.3)' : undefined,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <Droplets size={iconSize} strokeWidth={2} />
      <span className="text-sm font-medium">Alagamentos</span>
    </button>
  );
}
