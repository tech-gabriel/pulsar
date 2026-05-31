import { useState } from 'react';
import { Info } from 'lucide-react';
import type { Camada } from '../../utils/camadas';

// ── Legenda dinâmica do mapa (ETAPA 6.1/6.3) ───────────────────────────────────
// Card glassmorphism no canto inferior do mapa. O conteúdo (título, barra de
// gradiente e labels) muda conforme a camada ativa. No desktop é sempre visível;
// no mobile vira um pill colapsável (toque para expandir/recolher).

interface LegendaConfig {
  titulo: string;
  gradiente: string;
  labels: string[];
}

const LEGENDAS: Record<Camada, LegendaConfig> = {
  score: {
    titulo: 'Score de Perigo',
    gradiente: 'linear-gradient(to right, #22C55E, #EAB308, #EF4444)',
    labels: ['0', '30', '60', '100'],
  },
  temperatura: {
    titulo: 'Temperatura °C',
    gradiente: 'linear-gradient(to right, #3B82F6, #22C55E, #F59E0B, #EF4444)',
    labels: ['0°', '10°', '20°', '30°', '40°'],
  },
  chuva: {
    titulo: 'Precipitação mm/h',
    gradiente: 'linear-gradient(to right, rgba(148,163,184,0.3), #3B82F6, #1D4ED8)',
    labels: ['0', '10', '25', '50+'],
  },
  vento: {
    titulo: 'Vento km/h',
    gradiente: 'linear-gradient(to right, #94A3B8, #EAB308, #F59E0B, #EF4444)',
    labels: ['0', '20', '40', '60', '80+'],
  },
  uv: {
    titulo: 'Índice UV',
    gradiente: 'linear-gradient(to right, #22C55E, #EAB308, #F59E0B, #EF4444, #9333EA)',
    labels: ['0', '3', '6', '8', '11+'],
  },
};

// Card glass base (valores exatos da spec 6.1)
const CARD: React.CSSProperties = {
  background: 'rgba(5, 47, 74, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 188, 255, 0.12)',
  borderRadius: 10,
};

const TITULO: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  fontSize: 11,
  color: 'var(--color-pulsar-200)',
};

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontWeight: 400,
  fontSize: 10,
  color: 'var(--color-pulsar-300)',
};

interface Props {
  camadaAtiva: Camada;
  isMobile: boolean;
}

/** Conteúdo interno (título + barra + labels). A key força o fade ao trocar a camada. */
function ConteudoLegenda({ config }: { config: LegendaConfig }) {
  return (
    <div key={config.titulo} className="legend-fade">
      <p style={{ ...TITULO, marginBottom: 6 }}>{config.titulo}</p>
      <div style={{ height: 8, borderRadius: 4, background: config.gradiente }} />
      <div className="flex justify-between" style={{ marginTop: 4 }}>
        {config.labels.map((l) => (
          <span key={l} style={LABEL}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function MapLegend({ camadaAtiva, isMobile }: Props) {
  const config = LEGENDAS[camadaAtiva];
  const [expandido, setExpandido] = useState(false);

  // ── Desktop / tablet: card fixo no canto inferior direito (margin 16px) ──────
  if (!isMobile) {
    return (
      <div
        className="absolute z-[1000] pointer-events-auto"
        style={{ ...CARD, right: 16, bottom: 16, padding: '10px 14px', minWidth: 160 }}
        aria-label={`Legenda: ${config.titulo}`}
      >
        <ConteudoLegenda config={config} />
      </div>
    );
  }

  // ── Mobile: pill colapsável. Posicionado acima do drawer (que ocupa ~3.5rem) ──
  // para não sobrepor o handle; lado esquerdo para liberar o FAB (à direita).
  return (
    <div className="absolute z-[1000] pointer-events-auto" style={{ left: 8, bottom: '4rem' }}>
      {expandido ? (
        <button
          type="button"
          onClick={() => setExpandido(false)}
          className="block text-left active:scale-[0.98] transition-transform"
          style={{ ...CARD, padding: '10px 14px', minWidth: 160 }}
          aria-expanded
          aria-label={`Recolher legenda: ${config.titulo}`}
        >
          <ConteudoLegenda config={config} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="flex items-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ ...CARD, padding: '6px 10px', height: 28, minWidth: 120 }}
          aria-expanded={false}
          aria-label={`Expandir legenda: ${config.titulo}`}
        >
          <Info size={16} className="text-pulsar-300 flex-shrink-0" />
          <span className="truncate" style={TITULO}>{config.titulo}</span>
        </button>
      )}
    </div>
  );
}
