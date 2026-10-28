import { Bell, Droplets, MapPin } from 'lucide-react';

const PASSOS = [
  { Icone: MapPin, t: 'Escolha suas regiões', d: 'Casa, trabalho, a escola dos filhos. Quantas quiser.' },
  { Icone: Droplets, t: 'O Pulsar acompanha', d: 'Chuva e risco recalculados a cada 15 minutos, dia e noite.' },
  { Icone: Bell, t: 'Você recebe o aviso', d: 'Notificação no celular quando o risco sobe, antes de sair de casa.' },
];

export default function LandingPassos() {
  return (
    <section className="landing-section" aria-labelledby="passos-titulo">
      <div data-revelar>
        <p className="lp-rotulo">Como funciona</p>
        <h2 id="passos-titulo" className="lp-h2 mt-3">Três passos e pronto</h2>
      </div>
      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {PASSOS.map(({ Icone, t, d }, i) => (
          <li key={t} data-revelar className="lp-superficie rounded-3xl p-5 sm:p-6 flex sm:block gap-4 items-start">
            <div className="flex items-center justify-between shrink-0">
              <span className="lp-icone"><Icone size={20} aria-hidden="true" /></span>
              <span className="hidden sm:inline lp-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>0{i + 1}</span>
            </div>
            <div>
              <h3 className="lp-titulo sm:mt-5 font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
