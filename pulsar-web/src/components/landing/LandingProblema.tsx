import { CloudRain, TriangleAlert, Clock } from 'lucide-react';
import Reveal from './Reveal';

const PONTOS = [
  {
    Icon: CloudRain,
    title: 'Chuva que vira alagamento',
    desc: 'Temporais de verão sobrecarregam córregos e bocas de lobo em minutos, e o risco muda de bairro para bairro.',
  },
  {
    Icon: TriangleAlert,
    title: 'Aviso que chega tarde',
    desc: 'Quando o alerta genérico aparece, o transtorno (ou o perigo) muitas vezes já começou na sua região.',
  },
  {
    Icon: Clock,
    title: 'Decisão sem tempo a perder',
    desc: 'Sair agora ou esperar? Ir de carro ou não? Sem um retrato local e atual, a escolha vira aposta.',
  },
];

export default function LandingProblema() {
  return (
    <section className="landing-section">
      <Reveal>
        <p
          className="uppercase tracking-[0.18em] text-xs font-semibold"
          style={{ color: 'var(--text-accent)' }}
        >
          O problema
        </p>
        <h2
          className="mt-3 max-w-3xl leading-tight"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--text-primary)' }}
        >
          Em São Paulo, o clima muda rápido, e <span className="landing-gradient-text">por região</span>.
        </h2>
        <p className="mt-4 max-w-2xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          A média da cidade esconde o que importa: o risco onde você está, agora. O Pulsar
          existe para fechar essa lacuna.
        </p>
      </Reveal>

      <div className="mt-10 grid sm:grid-cols-3 gap-5">
        {PONTOS.map(({ Icon, title, desc }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="landing-card h-full">
              <div className="landing-card-ic">
                <Icon size={22} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
