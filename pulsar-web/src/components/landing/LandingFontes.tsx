import { CloudSun, Building2, MapPinned, RefreshCw, type LucideIcon } from 'lucide-react';
import Reveal from './Reveal';

const FONTES: { Icon: LucideIcon; label: string }[] = [
  { Icon: CloudSun, label: 'OpenWeatherMap' },
  { Icon: Building2, label: 'CGE-SP' },
  { Icon: MapPinned, label: '32 subprefeituras' },
  { Icon: RefreshCw, label: 'Atualização a cada 15 min' },
];

export default function LandingFontes() {
  return (
    <section className="landing-section !py-16 text-center">
      <Reveal>
        <p className="uppercase tracking-[0.18em] text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
          Dados confiáveis
        </p>
        <h2
          className="mt-3 mx-auto max-w-2xl leading-tight"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(24px, 3vw, 32px)', color: 'var(--text-primary)' }}
        >
          Construído sobre fontes oficiais
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {FONTES.map(({ Icon, label }) => (
            <span key={label} className="landing-pill">
              <Icon size={16} style={{ color: 'var(--text-accent)' }} />
              {label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
