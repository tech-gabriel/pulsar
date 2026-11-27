import { useRef } from 'react';
import { MUNICIPIOS_PATHS, VIEWBOX_BAIXADA } from './mapaBaixadaPaths';
import { numerosDe } from '../../data/baixada-seo';
import { PALETA, comAlfa } from '../../utils/paleta';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';

const razao = (slug: string) => {
  const n = numerosDe(slug);
  return n && n.trechos > 0 ? n.trechosRisco / n.trechos : 0;
};
const MAXIMA = Math.max(...MUNICIPIOS_PATHS.map((m) => razao(m.id)));

/** Mapa da Baixada colorido pela fatia de trechos que costumam alagar em cada município. */
export default function MapaBaixada({ selecionado, onSelecionar, className = '' }: {
  selecionado?: string;
  onSelecionar?: (slug: string) => void;
  className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const alvo = selecionado && svg.current?.querySelector<SVGPathElement>(`path[data-id="${selecionado}"]`);
    const anel = svg.current?.querySelector('circle');
    if (!alvo || !anel) return;
    // Com menos movimento o anel nem aparece: a borda grossa já marca o município.
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      const b = alvo.getBBox();
      gsap.set(anel, { attr: { cx: b.x + b.width / 2, cy: b.y + b.height / 2 } });
      gsap.fromTo(anel, { attr: { r: 8 }, opacity: 0.7 }, { attr: { r: 70 }, opacity: 0, duration: 1.8, ease: 'power1.out', repeat: -1 });
    });
  }, { scope: svg, dependencies: [selecionado] });

  return (
    <svg ref={svg} viewBox={VIEWBOX_BAIXADA} className={`w-full h-auto ${className}`} role="img" aria-label="Mapa da Baixada Santista com os trechos que costumam alagar">
      {/* O selecionado vai por último: no SVG quem vem depois pinta por cima e a borda grossa aparece inteira. */}
      {[...MUNICIPIOS_PATHS].sort((a, b) => Number(a.id === selecionado) - Number(b.id === selecionado)).map((m) => {
        const n = numerosDe(m.id);
        const t = MAXIMA > 0 ? Math.sqrt(razao(m.id) / MAXIMA) : 0; // raiz: o líder não apaga o resto
        const ativo = m.id === selecionado;
        return (
          <path key={m.id} d={m.d} data-id={m.id}
            fill={comAlfa(PALETA.azul, 0.12 + t * 0.78)}
            stroke={ativo ? 'var(--color-pulsar-600)' : 'var(--bg-primary)'}
            strokeWidth={ativo ? 5 : 2}
            strokeLinejoin="round"
            className={onSelecionar ? 'cursor-pointer transition-[stroke] hover:brightness-110' : undefined}
            onClick={onSelecionar ? () => onSelecionar(m.id) : undefined}>
            <title>{`${m.nome}: ${n?.trechosRisco ?? 0} de ${n?.trechos ?? 0} trechos costumam alagar`}</title>
          </path>
        );
      })}
      {selecionado && <circle cx={0} cy={0} r={8} fill="none" stroke="var(--color-pulsar-600)" strokeWidth={4} opacity={0} pointerEvents="none" />}
    </svg>
  );
}

export function LegendaMapaBaixada() {
  return (
    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      <span>menos</span>
      <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${comAlfa(PALETA.azul, 0.12)}, ${comAlfa(PALETA.azul, 0.9)})` }} />
      <span>mais trechos que costumam alagar</span>
    </div>
  );
}
