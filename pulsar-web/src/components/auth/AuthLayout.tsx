import type { ReactNode } from 'react';
import { Activity, MapPin, BellRing, type LucideIcon } from 'lucide-react';
import logoLockup from '../../assets/logos/pulsar-lockup-escuro.svg';

const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Activity, title: 'Monitoramento em tempo real', desc: 'Dados climáticos atualizados a cada 15 minutos' },
  { Icon: MapPin, title: '32 subprefeituras', desc: 'Cobertura completa de toda a cidade de São Paulo' },
  { Icon: BellRing, title: 'Alertas de risco', desc: 'Score de perigo e sugestões de segurança' },
];

/**
 * Layout split-screen das telas de autenticação: painel hero com a marca à
 * esquerda (lg+) e a área do formulário à direita. No mobile o hero some e o
 * formulário recebe um logo compacto no topo.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-dark-scope auth-bg auth-split">
      {/* ── HERO (marca) — lg+ ─────────────────────────────────────────────── */}
      <aside className="auth-hero">
        {/* Radar decorativo */}
        <div className="auth-radar" aria-hidden="true">
          <span className="auth-radar-ring" />
          <span className="auth-radar-ring" style={{ animationDelay: '1.05s' }} />
          <span className="auth-radar-ring" style={{ animationDelay: '2.1s' }} />
          <span className="auth-radar-core" />
        </div>

        {/* Topo: logo */}
        <img src={logoLockup} alt="Pulsar" className="relative z-10 w-[190px] h-auto" />

        {/* Meio: headline + benefícios */}
        <div className="relative z-10">
          <h2
            className="leading-tight"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30, color: 'var(--text-primary)' }}
          >
            O mapa vivo da
            <br />
            sua segurança
          </h2>
          <p className="mt-3 max-w-sm" style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Acompanhe o risco climático de São Paulo em tempo real e antecipe-se aos perigos.
          </p>

          <div className="flex flex-col gap-5 mt-9">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="auth-feature">
                <div className="auth-feature-ic">
                  <Icon size={20} />
                </div>
                <div className="leading-tight">
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative z-10" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © 2026 Pulsar · Monitoramento climático de São Paulo
        </p>
      </aside>

      {/* ── FORMULÁRIO ─────────────────────────────────────────────────────── */}
      <main className="auth-form-pane">
        <div className="w-full max-w-[400px]">
          {/* Logo compacto (apenas mobile, onde o hero está oculto) */}
          <img
            src={logoLockup}
            alt="Pulsar"
            className="lg:hidden mx-auto w-[210px] h-auto mb-8"
            style={{ filter: 'drop-shadow(0 0 30px rgba(0, 188, 255, 0.4))' }}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
