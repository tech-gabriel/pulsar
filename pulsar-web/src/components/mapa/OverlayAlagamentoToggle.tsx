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
 * sozinho não anuncia o que a camada mostra. Desde 11/2026 é só a gota, do tamanho do zoom e
 * empilhada com ele (uma coluna de controles, como no Mapas da Apple); o nome fica no
 * aria-label e no title.
 */
export default function OverlayAlagamentoToggle({ ativo, onToggle, isMobile }: Props) {
  // No tablet e no computador fica na coluna da esquerda, logo abaixo do zoom (.alag-toggle).
  const pos = isMobile ? 'absolute top-[calc(var(--topo-app)+7.5rem)] right-3' : 'alag-toggle';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      aria-label="Alagamentos"
      title={ativo ? 'Ocultar alagamentos' : 'Mostrar alagamentos dos últimos 12 meses'}
      className={[
        'mapa-controle layer-btn z-[1000] flex items-center justify-center rounded-xl',
        ativo ? 'ativo' : '',
        isMobile ? 'w-11 h-11' : 'w-10 h-10',
        pos,
      ].join(' ')}
      style={ativo ? undefined : { color: 'var(--mapa-controle-texto-suave)' }}
    >
      <Droplets size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
