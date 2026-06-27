import { Link } from 'react-router-dom';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

export default function LandingFooter() {
  return (
    <footer
      className="relative z-[1] mt-6"
      style={{ borderTop: '1px solid var(--border-glass)' }}
    >
      <div className="max-w-[1120px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src={iconePulsar} alt="" className="w-8 h-8" style={{ filter: 'drop-shadow(var(--glow-cyan))' }} />
          <div className="leading-tight">
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              PULSAR
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Monitoramento climático de São Paulo
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5" style={{ fontSize: 14 }}>
          <Link to="/sobre" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Sobre
          </Link>
          <Link to="/privacidade" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Privacidade
          </Link>
          <Link to="/termos" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Termos
          </Link>
          <Link to="/login" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Entrar
          </Link>
        </nav>
      </div>

      <p className="text-center pb-8" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        © 2026 Pulsar
      </p>
    </footer>
  );
}
