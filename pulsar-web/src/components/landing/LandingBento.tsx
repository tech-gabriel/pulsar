import { useRef } from 'react';
import { CloudRain, ShieldCheck } from 'lucide-react';
import { ANO, TOTAL_ALAGAMENTOS } from '../../data/landing-dados';
import { PALETA, comAlfa } from '../../utils/paleta';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';
import MapaAlagamentos, { LegendaMapa } from './MapaAlagamentos';

const SCORE_EXEMPLO = 64;
const ARCO = Math.PI * 52;

function Tile({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div data-revelar className={`lp-superficie rounded-3xl p-6 overflow-hidden relative ${className}`}>{children}</div>;
}

function TituloTile({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="lp-titulo text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{titulo}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed max-w-[38ch]" style={{ color: 'var(--text-secondary)' }}>{texto}</p>
    </div>
  );
}

/** O produto em blocos: mapa, aviso no celular, score. Cada bloco ganha vida ao entrar na tela. */
export default function LandingBento() {
  const raiz = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      // Notificação chega como no iPhone: desce e assenta.
      gsap.from('[data-notificacao]', {
        y: -28, scale: 0.94, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.7)', stagger: 0.35,
        scrollTrigger: { trigger: '[data-notificacao]', start: 'top 85%' },
      });
      // Score sobe de zero até o valor, arco e número juntos.
      const texto = raiz.current?.querySelector('[data-score-valor]');
      const s = { v: 0 };
      gsap.timeline({ scrollTrigger: { trigger: '[data-score]', start: 'top 85%' } })
        .from('[data-score-arco]', { attr: { 'stroke-dasharray': `0 ${ARCO}` }, duration: 1.2, ease: 'power3.out' })
        .to(s, { v: SCORE_EXEMPLO, duration: 1.2, ease: 'power3.out', onUpdate: () => { if (texto) texto.textContent = String(Math.round(s.v)); } }, 0)
        .from('[data-score-faixa]', { autoAlpha: 0, x: -8, duration: 0.4 }, 0.8);
    });
  }, { scope: raiz });

  return (
    <section ref={raiz} className="landing-section" aria-labelledby="bento-titulo">
      <div data-revelar className="max-w-2xl">
        <p className="lp-rotulo">O app</p>
        <h2 id="bento-titulo" className="lp-h2 mt-3">O que você vê quando entra</h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-6">
        <Tile className="md:col-span-4 md:row-span-2">
          <TituloTile titulo="A cidade inteira num mapa" texto={`Cada subprefeitura com o próprio risco. Aqui, os ${TOTAL_ALAGAMENTOS} alagamentos registrados em ${ANO}.`} />
          <div className="mt-4 flex flex-col items-center gap-3">
            <MapaAlagamentos entrada className="max-h-[440px]" />
            <LegendaMapa />
          </div>
        </Tile>
        <Tile className="md:col-span-2">
          <TituloTile titulo="Aviso antes da chuva" texto="Escolha suas regiões e receba a notificação quando o risco subir." />
          <div className="mt-5 flex flex-col gap-2.5">
            <Notificacao titulo="Chuva forte chegando na Mooca" texto="Risco subiu para Atenção. Previsão de 25 mm na próxima hora." quando="agora" />
            <Notificacao titulo="Risco voltou ao normal" texto="A chuva passou pela Mooca. Bom caminho." quando="há 2 h" apagada />
          </div>
        </Tile>
        <Tile className="md:col-span-2">
          <TituloTile titulo="Um número, sem jargão" texto="O Score de Perigo vai de 0 a 100 e diz se é dia de mudar o caminho." />
          <div className="mt-4 flex items-center gap-3" data-score>
            <svg viewBox="0 0 120 70" className="w-40" role="img" aria-label={`Score de exemplo: ${SCORE_EXEMPLO} de 100`}>
              <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="var(--border-glass)" strokeWidth="10" strokeLinecap="round" />
              <path data-score-arco d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke={PALETA.ambar} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(SCORE_EXEMPLO / 100) * ARCO} ${ARCO}`} />
              <text data-score-valor x="60" y="58" textAnchor="middle" className="lp-mono" style={{ fontSize: 24, fontWeight: 600, fill: 'var(--text-primary)' }}>{SCORE_EXEMPLO}</text>
            </svg>
            <span data-score-faixa className="text-[13px] font-semibold px-2.5 py-1 rounded-full" style={{ color: PALETA.ambar, background: comAlfa(PALETA.ambar, 0.14) }}>Atenção</span>
          </div>
        </Tile>
        <Tile className="md:col-span-3">
          <div className="flex gap-3 items-start">
            <CloudRain size={22} style={{ color: 'var(--text-accent)' }} className="shrink-0" aria-hidden="true" />
            <TituloTile titulo="Atualizado a cada 15 minutos" texto="Chuva, vento e calor de fontes públicas, cruzados com o histórico de alagamentos da Prefeitura." />
          </div>
        </Tile>
        <Tile className="md:col-span-3">
          <div className="flex gap-3 items-start">
            <ShieldCheck size={22} style={{ color: 'var(--text-accent)' }} className="shrink-0" aria-hidden="true" />
            <TituloTile titulo="Sem caixa-preta" texto="Você vê de onde vem cada número e o que pesou no score da sua região." />
          </div>
        </Tile>
      </div>
    </section>
  );
}

/** Notificação no estilo iOS, mostrando o que o usuário recebe. Texto ilustrativo. */
function Notificacao({ titulo, texto, quando, apagada = false }: { titulo: string; texto: string; quando: string; apagada?: boolean }) {
  return (
    <div data-notificacao className="lp-notificacao rounded-[20px] p-3 flex gap-3 items-start" style={{ opacity: apagada ? 0.65 : undefined }}>
      <img src={iconePulsar} alt="" className="w-9 h-9 rounded-[9px] p-1 shrink-0" style={{ background: 'var(--bg-secondary)' }} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}><span className="font-semibold tracking-wide">PULSAR</span><span>{quando}</span></div>
        <p className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{titulo}</p>
        <p className="text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{texto}</p>
      </div>
    </div>
  );
}
