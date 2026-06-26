import Reveal from './Reveal';
// TODO: quando o usuário enviar o print, importar e usar no lugar do placeholder:
// import dashboardShot from '../../assets/landing/dashboard.png';

const PASSOS = [
  {
    num: '01',
    title: 'Coletamos os dados',
    desc: 'A cada 15 minutos buscamos as condições climáticas de toda São Paulo nas fontes oficiais.',
  },
  {
    num: '02',
    title: 'Calculamos o Score',
    desc: 'Cada uma das 32 subprefeituras recebe um Score de Perigo atualizado, do baixo ao crítico.',
  },
  {
    num: '03',
    title: 'Você acompanha e é avisado',
    desc: 'Veja tudo no mapa e no painel — e receba alertas quando a sua região mudar de patamar.',
  },
];

export default function LandingComoFunciona() {
  return (
    <section className="landing-section">
      <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
        {/* Passos */}
        <div>
          <Reveal>
            <p className="uppercase tracking-[0.18em] text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
              Como funciona
            </p>
            <h2
              className="mt-3 leading-tight"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--text-primary)' }}
            >
              Do dado bruto ao <span className="landing-gradient-text">seu alerta</span>
            </h2>
          </Reveal>

          <div className="mt-8 flex flex-col gap-6">
            {PASSOS.map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 0.08}>
                <div className="flex gap-5 items-start">
                  <span className="landing-step-num">{num}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' }}>
                      {title}
                    </h3>
                    <p className="mt-1.5" style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      {desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Visual: print do painel/dashboard */}
        <Reveal delay={0.1}>
          <div className="landing-shot">
            {/* TODO: trocar pelo print real — <img src={dashboardShot} alt="Painel do Pulsar" /> */}
            <div className="landing-shot-placeholder">Painel — Score por região</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
