import { Scale, ShieldCheck, HeartHandshake, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

const PILARES = [
  {
    Icon: Scale,
    title: 'Método claro',
    desc: 'O Score sai de variáveis objetivas, com pesos definidos para cada fator. Nada de achismo.',
  },
  {
    Icon: ShieldCheck,
    title: 'Dados rastreáveis',
    desc: 'Nada de números mágicos: cada leitura vem de uma fonte oficial e identificável.',
  },
  {
    Icon: HeartHandshake,
    title: 'Feito para a cidade',
    desc: 'Um projeto independente, pensado para ajudar quem vive em São Paulo a se proteger melhor no dia a dia.',
  },
];

export default function LandingConfianca() {
  return (
    <section className="landing-section">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-center">
        {/* Manifesto */}
        <Reveal>
          <p className="uppercase tracking-[0.18em] text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
            Transparência por princípio
          </p>
          <h2
            className="mt-3 leading-tight"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--text-primary)' }}
          >
            Sem caixa-preta no que <span className="landing-gradient-text">importa</span>
          </h2>
          <p className="mt-5 max-w-xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Informação de risco só vale se você puder confiar nela. Por isso deixamos claro
            como o Score de Perigo é calculado e de quais fontes oficiais cada número vem.
          </p>
          <a href="#faq" className="landing-cta-ghost mt-8">
            Ver como o Score é calculado
            <ArrowRight size={18} />
          </a>
        </Reveal>

        {/* Pilares */}
        <div className="flex flex-col gap-4">
          {PILARES.map(({ Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="landing-card landing-trust-row">
                <div className="landing-card-ic !mb-0">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>
                    {title}
                  </h3>
                  <p className="mt-1.5" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
