import { CloudSun, CloudRain, Building2, MapPinned, RefreshCw, type LucideIcon } from 'lucide-react';
import type { CidadeLanding } from './LandingBento';

type Fonte = { Icon: LucideIcon; label: string };
const OWM: Fonte = { Icon: CloudSun, label: 'OpenWeatherMap' };
const A_CADA_15: Fonte = { Icon: RefreshCw, label: 'Atualização a cada 15 min' };

const FONTES: Record<CidadeLanding, Fonte[]> = {
  sp: [OWM, { Icon: Building2, label: 'CGE-SP' }, { Icon: MapPinned, label: 'GeoSampa, da Prefeitura' }, A_CADA_15],
  baixada: [
    OWM,
    { Icon: CloudRain, label: 'CEMADEN' },
    { Icon: Building2, label: 'Defesa Civil' },
    { Icon: MapPinned, label: 'Serviço Geológico do Brasil' },
    A_CADA_15,
  ],
};

export default function LandingFontes({ cidade = 'sp' }: { cidade?: CidadeLanding }) {
  return (
    <section className="landing-section !py-14 text-center" aria-labelledby="fontes-titulo">
      <div data-revelar>
        <p className="lp-rotulo">Transparência</p>
        <h2 id="fontes-titulo" className="lp-h2 mt-3 mx-auto max-w-2xl">De onde vêm os números</h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {FONTES[cidade].map(({ Icon, label }) => (
            <span key={label} className="landing-pill">
              <Icon size={16} style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
        <p className="mt-6 mx-auto max-w-[52ch] text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          O Pulsar ajuda a decidir o dia a dia. Em emergência, ligue 199 (Defesa Civil) ou 193 (Bombeiros).
        </p>
      </div>
    </section>
  );
}
