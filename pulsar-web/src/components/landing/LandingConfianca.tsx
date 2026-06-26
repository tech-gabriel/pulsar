import { Code2, ShieldCheck, HeartHandshake, ArrowUpRight } from 'lucide-react';
import Reveal from './Reveal';

const REPO_URL = 'https://github.com/tech-gabriel/Pulsar';

const PILARES = [
  {
    Icon: Code2,
    title: 'Código aberto',
    desc: 'Todo o Pulsar é público no GitHub. Qualquer pessoa pode auditar como o risco é calculado.',
  },
  {
    Icon: ShieldCheck,
    title: 'Dados rastreáveis',
    desc: 'Nada de números mágicos: cada leitura vem de uma fonte oficial e identificável.',
  },
  {
    Icon: HeartHandshake,
    title: 'Feito para a cidade',
    desc: 'Um projeto independente, sem anúncios e sem vender seus dados. Você é o usuário, não o produto.',
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
            Construído <span className="landing-gradient-text">à vista de todos</span>
          </h2>
          <p className="mt-5 max-w-xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Informação de risco só vale se você puder confiar nela. Por isso o Pulsar
            não é uma caixa-preta: o cálculo, as fontes e o código estão abertos para
            qualquer um verificar.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-cta-ghost mt-8"
          >
            Ver o projeto no GitHub
            <ArrowUpRight size={18} />
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
