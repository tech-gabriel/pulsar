import { Link } from 'react-router-dom';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

const REPO_URL = 'https://github.com/tech-gabriel/Pulsar';

/** Marca do GitHub (a lucide-react removeu os ícones de marca). */
function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

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

        <nav className="flex items-center gap-5" style={{ fontSize: 14 }}>
          <Link to="/login" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Entrar
          </Link>
          <Link to="/cadastro" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Criar conta
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <GithubMark size={16} />
            GitHub
          </a>
        </nav>
      </div>

      <p className="text-center pb-8" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        © 2026 Pulsar
      </p>
    </footer>
  );
}
