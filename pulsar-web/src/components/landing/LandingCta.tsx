import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

export default function LandingCta() {
  return (
    <section className="landing-section">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-2xl text-center px-6 py-14 sm:py-16"
          style={{
            border: '1px solid var(--border-glass-hover)',
            background:
              'radial-gradient(120% 140% at 50% 0%, rgba(0, 132, 209, 0.28) 0%, transparent 55%), linear-gradient(160deg, #052F4A 0%, #03263B 70%, #021C2C 100%)',
          }}
        >
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
