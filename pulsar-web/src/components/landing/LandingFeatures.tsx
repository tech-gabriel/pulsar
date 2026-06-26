import { Gauge, Map, BellRing, BellPlus, TrendingUp, Newspaper, type LucideIcon } from 'lucide-react';
import Reveal from './Reveal';

const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Gauge, title: 'Score de Perigo', desc: 'Um índice claro de 0 a 100 por subprefeitura, calculado a partir dos dados climáticos mais recentes.' },
  { Icon: Map, title: 'Mapa heatmap', desc: 'As 32 subprefeituras de São Paulo coloridas pelo nível de risco, do verde ao vermelho, num só olhar.' },
  { Icon: BellRing, title: 'Alertas de risco', desc: 'Destaque automático das regiões em risco alto, com sugestões de segurança para o momento.' },
  { Icon: BellPlus, title: 'Notificações push', desc: 'Receba avisos no celular quando a sua região favorita entrar em estado de atenção.' },
  { Icon: TrendingUp, title: 'Histórico & tendências', desc: 'Veja a evolução do risco por região ao longo do tempo e entenda os padrões.' },
  { Icon: Newspaper, title: 'Feed de notícias', desc: 'Boletins e ocorrências da CGE-SP reunidos para complementar o que o mapa mostra.' },
];

export default function LandingFeatures() {
  return (
    <section id="recursos" className="landing-section">
      <Reveal>
        <p className="uppercase tracking-[0.18em] text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
          Recursos
        </p>
        <h2
          className="mt-3 max-w-3xl leading-tight"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--text-primary)' }}
        >
          Tudo para acompanhar o clima <span className="landing-gradient-text">com antecedência</span>
        </h2>
      </Reveal>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ Icon, title, desc }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.08}>
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
