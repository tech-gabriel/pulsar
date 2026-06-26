import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

export default function LandingCta() {
  return (
    <section className="landing-section">
      <Reveal>
        <div className="landing-cta-band">
          <h2
            className="mx-auto max-w-2xl leading-tight"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--text-primary)' }}
          >
            Comece agora a acompanhar o clima de São Paulo
          </h2>
          <p className="mx-auto mt-4 max-w-xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Crie sua conta gratuita e tenha o mapa de risco da cidade na palma da mão.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/cadastro" className="landing-cta">
              Comece agora
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="landing-cta-ghost">
              Já tenho conta
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
