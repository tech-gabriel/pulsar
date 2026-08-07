import { Droplets } from 'lucide-react';

interface Props {
  ativo: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

/**
 * Liga/desliga o overlay de alagamentos. Fica logo abaixo do seletor de camadas
 * nos dois tamanhos de tela: antes ele saltava do canto inferior esquerdo
 * (desktop) para o topo direito (mobile), o que fazia a mesma função trocar de
 * lugar entre plataformas. No desktop leva rótulo visível, porque um ícone
 * sozinho não anuncia o que a camada mostra.
 */
export default function OverlayAlagamentoToggle({ ativo, onToggle, isMobile }: Props) {
  const pos = isMobile ? 'top-[7.5rem] right-3' : 'left-3 top-1/2 mt-[8.5rem]';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      aria-label="Alagamentos"
      title={ativo ? 'Ocultar alagamentos' : 'Mostrar alagamentos dos últimos 12 meses'}
      className={[
        'mapa-controle layer-btn absolute z-[1000] flex items-center justify-center rounded-xl',
        isMobile ? 'w-11 h-11' : 'gap-2 px-3 min-h-11',
        pos,
      ].join(' ')}
      style={{
        background: ativo ? 'rgba(0, 132, 209, 0.9)' : undefined,
        color: ativo ? '#FFFFFF' : 'var(--mapa-controle-texto-suave)',
        boxShadow: ativo ? '0 0 12px rgba(0, 188, 255, 0.35)' : undefined,
      }}
    >
      <Droplets size={20} strokeWidth={2} />
      {!isMobile && <span className="text-sm font-medium">Alagamentos</span>}
    </button>
  );
}
