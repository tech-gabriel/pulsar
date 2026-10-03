import { useState } from 'react';
import { MapPin, X } from 'lucide-react';

const DISPENSADO_KEY = 'pulsar-banner-subprefeituras-dispensado';

function lerDispensado(): boolean {
  try {
    return sessionStorage.getItem(DISPENSADO_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Ponte até o onboarding de ativação (SP2): quem ficou sem favoritas depois da troca de
 * zona para subprefeitura não recebe aviso nenhum. Dispensar vale só para a sessão.
 */
export default function BannerEscolherSubprefeituras({ onEscolher }: { onEscolher: () => void }) {
  const [dispensado, setDispensado] = useState(lerDispensado);
  if (dispensado) return null;

  function dispensar() {
    try {
      sessionStorage.setItem(DISPENSADO_KEY, '1');
    } catch {
      /* ignora */
    }
    setDispensado(true);
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-[1200] bottom-[7.5rem] md:bottom-6 w-[calc(100%-1.5rem)] max-w-md animate-slide-up">
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: 'var(--bg-glass, rgba(5, 47, 74, 0.92))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass, rgba(0, 188, 255, 0.15))',
          boxShadow: '0 12px 40px rgba(2, 24, 38, 0.35)',
        }}
        role="region"
        aria-label="Escolher subprefeituras"
      >
        <MapPin size={18} style={{ color: 'var(--text-accent)' }} className="flex-shrink-0" />
        <p className="min-w-0 flex-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          O Pulsar agora avisa por subprefeitura. Escolha as suas para receber alertas.
        </p>
        <button type="button" onClick={onEscolher} className="btn-gradient rounded-lg px-3 min-h-11 inline-flex items-center text-xs font-semibold flex-shrink-0">
          Escolher
        </button>
        <button type="button" onClick={dispensar} aria-label="Dispensar" className="flex-shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
