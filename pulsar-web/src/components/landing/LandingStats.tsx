import { MapPinned, RefreshCcw, Database, Wallet } from 'lucide-react';
import Reveal from './Reveal';
import Contador from './Contador';

/**
 * Faixa de números/credibilidade logo após o hero. Valores reais e verificáveis
 * do produto — nada inflado. Os contadores animam ao entrar na viewport.
 */
const NUMEROS = [
  { Icon: MapPinned, para: 32, sufixo: '', label: 'Subprefeituras monitoradas', sub: 'Toda a cidade de São Paulo' },
  { Icon: RefreshCcw, para: 15, sufixo: ' min', label: 'Ciclo de atualização', sub: 'Dados sempre recentes' },
  { Icon: Database, para: 100, sufixo: '%', label: 'Fontes oficiais', sub: 'OpenWeatherMap + CGE-SP' },
  { Icon: Wallet, para: 0, prefixo: 'R$ ', label: 'Para começar', sub: 'Conta gratuita, sem cartão' },
];

export default function LandingStats() {
  return (
    <section className="landing-section !py-12 sm:!py-14">
      <div className="landing-stats">
        {NUMEROS.map(({ Icon, para, sufixo, prefixo, label, sub }, i) => (
          <Reveal key={label} delay={(i % 4) * 0.07}>
            <div className="landing-stat">
              <div className="landing-stat-ic">
                <Icon size={20} />
              </div>
              <div className="landing-stat-num">
                <Contador para={para} sufixo={sufixo} prefixo={prefixo} />
              </div>
              <p className="landing-stat-label">{label}</p>
              <p className="landing-stat-sub">{sub}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
