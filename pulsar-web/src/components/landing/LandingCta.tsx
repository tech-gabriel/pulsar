import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function LandingCta() {
  return (
    <section className="landing-section" aria-labelledby="cta-titulo">
      <div data-revelar className="lp-cta-final rounded-[32px] px-6 py-14 sm:px-12 sm:py-20 text-center">
        <h2 id="cta-titulo" className="lp-titulo mx-auto max-w-[18ch] font-bold leading-[1.05] text-white" style={{ fontSize: 'clamp(32px, 5vw, 54px)' }}>
          Saiba antes que a água chegue.
        </h2>
        <p className="mx-auto mt-4 max-w-[42ch] text-[16px] sm:text-lg leading-relaxed text-pulsar-100">
          Crie a conta, escolha suas regiões e deixe o aviso com a gente. É grátis e não pede cartão.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/cadastro" className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-semibold bg-white text-pulsar-900 hover:bg-pulsar-50 transition-colors">
            Criar conta grátis <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link to="/login" className="inline-flex items-center h-12 px-5 rounded-full text-[15px] font-semibold text-white/90 hover:text-white">
            Já tenho conta
          </Link>
        </div>
      </div>
    </section>
  );
}
