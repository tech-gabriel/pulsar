import { Activity, Thermometer, CloudRain, Wind, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Camada } from '../../utils/camadas';

// Botões de camada, na ordem da spec (ETAPA 3.1). Score é o default ativo.
const ITENS: { id: Camada; label: string; Icon: LucideIcon }[] = [
  { id: 'score', label: 'Score', Icon: Activity },
  { id: 'temperatura', label: 'Temp', Icon: Thermometer },
  { id: 'chuva', label: 'Chuva', Icon: CloudRain },
  { id: 'vento', label: 'Vento', Icon: Wind },
  { id: 'uv', label: 'UV', Icon: Sun },
];

interface Props {
  camadaAtiva: Camada;
  onChange: (camada: Camada) => void;
  isMobile: boolean;
}

// Estilos do card glassmorphism (valores exatos da spec). Diferem entre
// desktop (coluna vertical à esquerda) e mobile (barra horizontal no topo).
const CARD_DESKTOP: React.CSSProperties = {
  background: 'rgba(5, 47, 74, 0.7)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 188, 255, 0.12)',
  borderRadius: 12,
  padding: 8,
  gap: 4,
};

const CARD_MOBILE: React.CSSProperties = {
  background: 'rgba(5, 47, 74, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 188, 255, 0.12)',
  borderRadius: 12,
  padding: '6px 8px',
  gap: 2,
};

function estiloBotao(ativo: boolean): React.CSSProperties {
  if (ativo) {
    return {
      background: 'rgba(0, 132, 209, 0.8)',
      color: 'white',
      borderRadius: 8,
      boxShadow: '0 0 12px rgba(0, 188, 255, 0.3)',
    };
  }
  return {
    background: 'transparent',
    color: 'rgba(184, 230, 254, 0.7)',
    borderRadius: 8,
  };
}

export default function LayerControl({ camadaAtiva, onChange, isMobile }: Props) {
  const iconSize = isMobile ? 18 : 20;

  return (
    <div
      role="radiogroup"
      aria-label="Camada do mapa"
      className={
        isMobile
          ? 'absolute top-16 left-1/2 -translate-x-1/2 z-[1000] flex flex-row max-w-[calc(100%-1.5rem)] overflow-x-auto no-scrollbar'
          : 'absolute left-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col'
      }
      style={isMobile ? CARD_MOBILE : CARD_DESKTOP}
    >
      {ITENS.map(({ id, label, Icon }) => {
        const ativo = id === camadaAtiva;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={[
              'layer-btn flex items-center flex-shrink-0',
              isMobile ? 'flex-col gap-0.5 px-2 py-1.5' : 'gap-2 px-3 py-2',
              ativo ? 'ativo' : '',
            ].join(' ')}
            style={estiloBotao(ativo)}
          >
            <Icon size={iconSize} strokeWidth={2} />
            {!isMobile && <span className="text-sm font-medium">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
