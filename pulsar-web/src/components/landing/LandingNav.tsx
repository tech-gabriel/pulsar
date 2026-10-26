import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

/**
 * Barra de topo da landing pública. Diferente do `Header` do app (que é
 * navegação autenticada com logout/tema/sino): aqui só marca + entrada/cadastro.
 */
export default function LandingNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="landing-nav">
      <Link to="/" className="flex items-center gap-2 min-h-11 shrink-0" aria-label="Pulsar, página inicial">
        <img src={iconePulsar} alt="" className="w-8 h-8" />
        <span className="lp-titulo text-[19px] font-bold" style={{ color: 'var(--text-primary)' }}>Pulsar</span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-glass-hover)]"
          style={{ color: 'var(--text-secondary)' }}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link to="/login" className="text-sm font-semibold px-2.5 sm:px-3 min-h-11 inline-flex items-center rounded-full" style={{ color: 'var(--text-secondary)' }}>
          Entrar
        </Link>
        <Link to="/cadastro" className="whitespace-nowrap px-4 min-h-10 inline-flex items-center rounded-full text-sm font-semibold text-white bg-pulsar-600 hover:bg-pulsar-500 transition-colors">
          Criar conta
        </Link>
      </div>
    </nav>
  );
}
