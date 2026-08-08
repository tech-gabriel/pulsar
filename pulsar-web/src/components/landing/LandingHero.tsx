import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import { useTheme } from '../../hooks/useTheme';
import lockupEscuro from '../../assets/logos/pulsar-lockup-escuro.svg';
import lockupClaro from '../../assets/logos/pulsar-lockup-claro.svg';
import MapaCena from './MapaCena';

export default function LandingHero() {
  // O lockup traz a cor no próprio SVG (escuro = texto #dff2fe, claro = #024a70),
  // então precisa acompanhar o tema; fixo no escuro ele some no fundo claro.
  // Os dois ficam abaixo do limite de inline do Vite e viram `data:` URI, então
  // não caem na armadilha de asset importado de `src/` quebrando no SSG.
  const { theme } = useTheme();
  const logoLockup = theme === 'light' ? lockupClaro : lockupEscuro;

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

      {/* Coluna visual: mapa vetorial de São Paulo com radar decorativo */}
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

        <div className="landing-shot-vetor">
          {/* compacta: recorta a base do mapa e a dissolve num fade, para caber
              na primeira dobra; a narrativa abaixo usa o mapa cheio. */}
          <MapaCena cena="risco" compacta />
        </div>
      </motion.div>
    </header>
  );
}
