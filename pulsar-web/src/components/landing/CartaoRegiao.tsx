import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, MapPin } from 'lucide-react';
import { getSubprefeituraView } from '../../data/regiao-view';
import { PREFIXO_REGIAO } from '../../data/regioes-seo';
import { ANO, mesPorExtenso, posicaoDe } from '../../data/landing-dados';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';

/** Cartão com os números reais de uma subprefeitura. Troca com transição e o total conta até o valor. */
export default function CartaoRegiao({ slug }: { slug: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const v = getSubprefeituraView(slug);
  const total = v?.ocorrencias?.total ?? 0;

  useGSAP(() => {
    // Na montagem o número já vem certo do SSG; só anima quando a pessoa troca de região.
    if (primeira.current) { primeira.current = false; return; }
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.fromTo(raiz.current, { y: 10, autoAlpha: 0.4, scale: 0.985 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
      const n = raiz.current?.querySelector('[data-total]');
      const contador = { v: 0 };
      gsap.to(contador, { v: total, duration: 0.9, ease: 'power2.out', onUpdate: () => { if (n) n.textContent = String(Math.round(contador.v)); } });
    });
  }, { scope: raiz, dependencies: [slug] });

  if (!v) return null;
  const pico = mesPorExtenso(v.ocorrencias?.mesPico);
  const posicao = posicaoDe(slug);

  return (
    <div ref={raiz} className="lp-superficie rounded-3xl p-5 sm:p-6 text-left" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{v.zona.nome}</p>
          <p className="lp-titulo mt-0.5 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{v.nome}</p>
        </div>
        <MapPin size={20} style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="lp-mono text-4xl font-semibold" style={{ color: 'var(--text-primary)' }} data-total>{total}</p>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>alagamentos registrados em {ANO}</p>
        </div>
        <div>
          <p className="lp-titulo text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{posicao}ª</p>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>com mais registros entre as 32 regiões</p>
        </div>
      </div>
      <p className="mt-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {pico && <>Mês com mais registros: {pico}. </>}Fonte: Prefeitura de São Paulo (GeoSampa).
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link to="/cadastro" className="sm:flex-1 whitespace-nowrap inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full text-sm font-semibold text-white bg-pulsar-600 hover:bg-pulsar-500 transition-colors">
          <Bell size={16} aria-hidden="true" /> Receber alertas {v.deNome}
        </Link>
        <Link to={`${PREFIXO_REGIAO}/${v.slug}`} className="whitespace-nowrap inline-flex items-center justify-center gap-1 h-11 px-4 rounded-full text-sm font-semibold border transition-colors hover:bg-[var(--bg-glass-hover)]"
          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-glass)' }}>
          Ver a região <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
