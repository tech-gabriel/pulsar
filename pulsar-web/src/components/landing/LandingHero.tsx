import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import { useTheme } from '../../hooks/useTheme';
import logoLockup from '../../assets/logos/pulsar-lockup-escuro.svg';

// Prints do produto servidos de `public/` (URL estável, sem hash). Assets
// importados de `src/` são resolvidos com caminho de source cru no HTML
// prerenderizado pelo SSG (viram 404 em produção), então ficam em `public/`.
const MAPA_ESCURO = '/landing/mapa.jpg';
const MAPA_CLARO = '/landing/mapa-claro.jpg';

export default function LandingHero() {
  const { theme } = useTheme();
  const mapa = theme === 'light' ? MAPA_CLARO : MAPA_ESCURO;

  return (
    <header className="landing-section !pt-16 sm:!pt-24 !pb-10 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
      {/* Coluna de texto */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURACAO.lenta, ease: EASE_SUAVE }}
      >
        <img src={logoLockup} alt="Pulsar" className="w-[230px] sm:w-[280px] h-auto" />

        <h1
          className="mt-7 leading-[1.08]"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(34px, 5vw, 56px)', color: 'var(--text-primary)' }}
        >
          O mapa vivo da
          <br />
          <span className="landing-gradient-text">sua segurança</span>
        </h1>

        <p
          className="mt-5 max-w-xl"
          style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
          Acompanhe o risco climático de São Paulo em tempo real, subprefeitura por
          subprefeitura, e não seja pego de surpresa pela chuva.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/login" className="landing-cta">
            Acessar o Pulsar
            <ArrowRight size={18} />
          </Link>
          <Link to="/cadastro" className="landing-cta-ghost">
            Criar conta
          </Link>
        </div>
      </motion.div>

      {/* Coluna visual: print do produto (mapa) com radar decorativo */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURACAO.lenta, ease: EASE_SUAVE, delay: 0.1 }}
      >
        <div className="auth-radar" aria-hidden="true" style={{ top: '-26px', right: '-10px' }}>
          <span className="auth-radar-ring" />
          <span className="auth-radar-ring" style={{ animationDelay: '1.05s' }} />
          <span className="auth-radar-ring" style={{ animationDelay: '2.1s' }} />
          <span className="auth-radar-core" />
        </div>

        <div className="landing-shot">
          <img src={mapa} alt="Mapa de risco do Pulsar: Score de Perigo por subprefeitura de São Paulo" />
        </div>
      </motion.div>
    </header>
  );
}
