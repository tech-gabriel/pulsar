import { useRef } from 'react';
import { SUBPREFEITURAS, VIEWBOX } from './mapaPaths';
import { ANO, MAX_ALAGAMENTOS, totalDe } from '../../data/landing-dados';
import { PALETA, comAlfa } from '../../utils/paleta';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';

/**
 * Mapa de SP colorido pelo total de alagamentos registrados (escala sequencial azul).
 * `entrada`: as regiões acendem do centro para fora quando o mapa entra na tela.
 * Com `selecionada`, um pulso marca a região escolhida.
 */
export default function MapaAlagamentos({ selecionada, onSelecionar, entrada = false, className = '' }: {
  selecionada?: string;
  onSelecionar?: (slug: string) => void;
  entrada?: boolean;
  className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!entrada) return;
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.from('path', {
        opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.7, ease: 'power2.out',
        stagger: { amount: 0.9, from: 'center' },
        scrollTrigger: { trigger: svg.current, start: 'top 80%' },
      });
    });
  }, { scope: svg });

  useGSAP(() => {
    const alvo = selecionada && svg.current?.querySelector<SVGPathElement>(`path[data-id="${selecionada}"]`);
    const anel = svg.current?.querySelector('circle');
    if (!alvo || !anel) return;
    // Com menos movimento o anel nem aparece: a borda grossa já marca a região.
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      const b = alvo.getBBox();
      gsap.set(anel, { attr: { cx: b.x + b.width / 2, cy: b.y + b.height / 2 } });
      gsap.fromTo(anel, { attr: { r: 8 }, opacity: 0.7 }, { attr: { r: 70 }, opacity: 0, duration: 1.8, ease: 'power1.out', repeat: -1 });
    });
  }, { scope: svg, dependencies: [selecionada] });

  return (
    <svg ref={svg} viewBox={VIEWBOX} className={`w-full h-auto ${className}`} role="img" aria-label={`Mapa de São Paulo com os alagamentos registrados em ${ANO}`}>
      {/* A selecionada vai por último: no SVG quem vem depois pinta por cima e a borda grossa aparece inteira. */}
      {[...SUBPREFEITURAS].sort((a, b) => Number(a.id === selecionada) - Number(b.id === selecionada)).map((s) => {
        const total = totalDe(s.id);
        const t = Math.sqrt(total / MAX_ALAGAMENTOS); // raiz: a líder não apaga o resto
        const ativa = s.id === selecionada;
        return (
          <path key={s.id} d={s.d} data-id={s.id}
            fill={comAlfa(PALETA.azul, 0.12 + t * 0.78)}
            stroke={ativa ? 'var(--color-pulsar-600)' : 'var(--bg-primary)'}
            strokeWidth={ativa ? 6 : 2}
            strokeLinejoin="round"
            className={onSelecionar ? 'cursor-pointer transition-[stroke] hover:brightness-110' : undefined}
            onClick={onSelecionar ? () => onSelecionar(s.id) : undefined}>
            <title>{`${s.nome}: ${total} alagamentos`}</title>
          </path>
        );
      })}
      {selecionada && <circle r={8} fill="none" stroke="var(--color-pulsar-600)" strokeWidth={4} opacity={0} pointerEvents="none" />}
    </svg>
  );
}

export function LegendaMapa() {
  return (
    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      <span>menos</span>
      <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${comAlfa(PALETA.azul, 0.12)}, ${comAlfa(PALETA.azul, 0.9)})` }} />
      <span>mais alagamentos em {ANO}</span>
    </div>
  );
}
