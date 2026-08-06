import { Droplets } from 'lucide-react';

interface Props {
  ativo: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

/**
 * Botão flutuante compacto (só ícone) para ligar/desligar o overlay de
 * alagamentos. No mobile fica no topo-direita (espelhando o "Camadas" à
 * esquerda), fora da área do drawer inferior; no desktop, canto inferior
 * esquerdo. O rótulo acessível ("Alagamentos") vive no aria-label/title.
 */
export default function OverlayAlagamentoToggle({ ativo, onToggle, isMobile }: Props) {
  const pos = isMobile ? 'top-[6.5rem] right-3' : 'bottom-6 left-3';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      aria-label="Alagamentos"
      title={ativo ? 'Ocultar alagamentos' : 'Mostrar alagamentos (12 meses)'}
      className={`layer-btn absolute ${pos} z-[1000] flex items-center justify-center w-10 h-10 rounded-xl`}
      style={{
        background: ativo ? 'rgba(0, 132, 209, 0.9)' : 'var(--bg-primary)',
        color: ativo ? 'white' : 'var(--text-secondary)',
        border: '1px solid var(--border-glass)',
        boxShadow: ativo ? '0 0 12px rgba(0, 188, 255, 0.35)' : undefined,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <Droplets size={20} strokeWidth={2} />
    </button>
  );
}
