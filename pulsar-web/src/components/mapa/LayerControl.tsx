import { useState, useEffect, useRef } from 'react';
import { Activity, Thermometer, CloudRain, Wind, Sun, ChevronDown } from 'lucide-react';
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
  const [aberto, setAberto] = useState(false);
  const ativa = ITENS.find((i) => i.id === camadaAtiva) ?? ITENS[0];
  const mobileRef = useRef<HTMLDivElement>(null);

  // Fecha o popover mobile ao clicar fora ou pressionar Esc.
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: PointerEvent) {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  // ─── Mobile: botão único "Camadas" que abre o seletor ───
  // Ancorado à esquerda, abaixo da faixa de busca+dica (que ocupam o topo em
  // largura total) para não colidir com elas.
  if (isMobile) {
    return (
      <div ref={mobileRef} className="absolute top-[6.5rem] left-3 z-[1000] flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="true"
          aria-expanded={aberto}
          aria-label="Camadas"
          className="layer-btn flex items-center gap-2 px-3 py-2"
          style={{ ...CARD_MOBILE, color: 'white' }}
        >
          <ativa.Icon size={iconSize} strokeWidth={2} />
          <span className="text-sm font-medium">{ativa.label}</span>
          <ChevronDown size={16} />
        </button>

        {aberto && (
          <div role="radiogroup" aria-label="Camada do mapa" className="flex flex-col" style={CARD_MOBILE}>
            {ITENS.map(({ id, label, Icon }) => {
              const sel = id === camadaAtiva;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  aria-label={label}
                  onClick={() => { onChange(id); setAberto(false); }}
                  className={['layer-btn flex items-center gap-2 px-3 py-2', sel ? 'ativo' : ''].join(' ')}
                  style={estiloBotao(sel)}
                >
                  <Icon size={iconSize} strokeWidth={2} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Desktop/tablet: coluna vertical de camadas (inalterado) ───
  return (
    <div
      role="radiogroup"
      aria-label="Camada do mapa"
      className="absolute left-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col"
      style={CARD_DESKTOP}
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
            className={['layer-btn flex items-center gap-2 px-3 py-2', ativo ? 'ativo' : ''].join(' ')}
            style={estiloBotao(ativo)}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
