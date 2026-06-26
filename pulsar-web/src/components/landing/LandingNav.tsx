import { Link } from 'react-router-dom';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

/**
 * Barra de topo da landing pública. Diferente do `Header` do app (que é
 * navegação autenticada com logout/tema/sino): aqui só marca + entrada/cadastro.
 */
export default function LandingNav() {
  return (
    <nav className="landing-nav">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Pulsar — início">
        <img
          src={iconePulsar}
          alt=""
          className="w-9 h-9"
          style={{ filter: 'drop-shadow(var(--glow-cyan))' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--text-primary)',
            textShadow: 'var(--glow-cyan)',
          }}
        >
          PULSAR
        </span>
      </Link>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link
          to="/login"
          className="text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          Entrar
        </Link>
        <Link to="/cadastro" className="landing-cta !px-4 !py-2 !text-sm">
          Criar conta
        </Link>
      </div>
    </nav>
  );
}
