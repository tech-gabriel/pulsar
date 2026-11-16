import { useState, useEffect, useRef } from 'react';
import { Activity, Thermometer, CloudRain, Wind, ChevronDown, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Camada } from '../../utils/camadas';
import MapLegend, { CartaoComoLer } from './MapLegend';

// Botões de camada, na ordem da spec (ETAPA 3.1). Score é o default ativo.
const ITENS: { id: Camada; label: string; Icon: LucideIcon }[] = [
  { id: 'score', label: 'Risco', Icon: Activity },
  { id: 'temperatura', label: 'Temp', Icon: Thermometer },
  { id: 'chuva', label: 'Chuva', Icon: CloudRain },
  { id: 'vento', label: 'Vento', Icon: Wind },
];

interface Props {
  camadaAtiva: Camada;
  onChange: (camada: Camada) => void;
  isMobile: boolean;
  /** Overlay de alagamentos ligado: a legenda ganha a chave das ocorrências. */
  overlayAlagamento?: boolean;
}

// Geometria do card. As cores vivem em `.mapa-controle` (index.css), que segue
// o tema: antes o azul escuro estava fixo aqui e o seletor continuava escuro
// com o app no tema claro.
const CARD_MOBILE: React.CSSProperties = { padding: '6px 8px', gap: 2 };

function estiloBotao(ativo: boolean): React.CSSProperties {
  if (ativo) {
    return {
      background: 'rgba(0, 132, 209, 0.85)',
      color: '#FFFFFF',
      borderRadius: 8,
      boxShadow: '0 4px 12px -4px rgba(0, 132, 209, 0.55)',
    };
  }
  return {
    background: 'transparent',
    color: 'var(--mapa-controle-texto-suave)',
    borderRadius: 8,
  };
}

export default function LayerControl({ camadaAtiva, onChange, isMobile, overlayAlagamento = false }: Props) {
  const iconSize = isMobile ? 18 : 20;
  const [aberto, setAberto] = useState(false);
  // Computador: o cartão "Como ler" abre pelo botão "i" e fica até a pessoa fechar.
  const [comoLer, setComoLer] = useState(false);
  const pilulaRef = useRef<HTMLDivElement>(null);
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

  // O cartão fecha no clique fora da pílula e no Esc, como o menu do celular.
  useEffect(() => {
    if (!comoLer) return;
    function aoClicarFora(e: PointerEvent) {
      if (pilulaRef.current && !pilulaRef.current.contains(e.target as Node)) setComoLer(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setComoLer(false);
    }
    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [comoLer]);

  // ─── Mobile: botão único "Camadas" que abre o seletor ───
  // Ancorado à esquerda, abaixo da faixa de busca+dica (que ocupam o topo em
  // largura total) para não colidir com elas.
  if (isMobile) {
    return (
      <div ref={mobileRef} className="absolute top-[calc(var(--topo-app)+7.5rem)] left-3 z-[1000] flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="true"
          aria-expanded={aberto}
          // WCAG 2.5.3: o nome acessível precisa começar pelo texto visível, que
          // aqui é a camada ativa. Com "Camadas" fixo, quem usa controle por voz
          // dizia "clicar em Score" e nada acontecia.
          aria-label={`${ativa.label}, escolher camada`}
          className="mapa-controle mapa-txt layer-btn flex items-center gap-2 px-3 min-h-11"
          style={CARD_MOBILE}
        >
          <ativa.Icon size={iconSize} strokeWidth={2} />
          <span className="text-sm font-medium">{ativa.label}</span>
          <ChevronDown size={16} />
        </button>

        {aberto && (
          <div role="radiogroup" aria-label="Camada do mapa" className="mapa-controle mapa-txt rounded-2xl flex flex-col" style={CARD_MOBILE}>
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
                  className={['layer-btn flex items-center gap-2 px-3 min-h-11', sel ? 'ativo' : ''].join(' ')}
                  style={estiloBotao(sel)}
                >
                  <Icon size={iconSize} strokeWidth={2} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
            {/* A legenda da camada mora aqui: aparece só quando a pessoa escolhe o que ver. */}
            <div className="mt-1 pt-0.5" style={{ borderTop: '1px solid var(--border-glass)' }}>
              <MapLegend camadaAtiva={camadaAtiva} overlayAlagamento={overlayAlagamento} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Tablet/computador: pílula horizontal (posição em .camadas-pilula, index.css) ───
  return (
    <div ref={pilulaRef} className="mapa-controle camadas-pilula">
      <div role="radiogroup" aria-label="Camada do mapa" className="flex" style={{ gap: 2 }}>
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
            className={['layer-btn flex items-center gap-2 px-3 min-h-11', ativo ? 'ativo' : ''].join(' ')}
            style={estiloBotao(ativo)}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}
      </div>
      <button
        type="button"
        onClick={() => setComoLer((v) => !v)}
        aria-expanded={comoLer}
        aria-controls="como-ler-camada"
        aria-label={comoLer ? 'Fechar a explicação da camada' : 'Como ler esta camada'}
        title={comoLer ? 'Fechar' : 'Como ler esta camada'}
        className={['camadas-info', comoLer ? 'aberto' : ''].join(' ')}
      >
        {comoLer ? <X size={18} strokeWidth={2} /> : <Info size={18} strokeWidth={2} />}
      </button>
      {comoLer && (
        <div id="como-ler-camada" role="dialog" aria-label="Como ler esta camada" className="camadas-como-ler superficie">
          <CartaoComoLer camadaAtiva={camadaAtiva} overlayAlagamento={overlayAlagamento} />
        </div>
      )}
    </div>
  );
}
