import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, MapPin } from 'lucide-react';
import { CIDADE_BAIXADA, getMunicipioPorSlug, numerosDe } from '../../data/baixada-seo';
import { PREFIXO_REGIAO } from '../../data/regioes-seo';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';

/** Cartão com os números reais de um município da Baixada (baixada-snapshot.json). Mesmo desenho do CartaoRegiao. */
export default function CartaoMunicipio({ slug }: { slug: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const m = getMunicipioPorSlug(slug);
  const n = numerosDe(slug);
  const risco = n?.trechosRisco ?? 0;

  useGSAP(() => {
    // Na montagem o número já vem certo do SSG; só anima quando a pessoa troca de cidade.
    if (primeira.current) { primeira.current = false; return; }
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.fromTo(raiz.current, { y: 10, autoAlpha: 0.4, scale: 0.985 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
      const el = raiz.current?.querySelector('[data-total]');
      const contador = { v: 0 };
      gsap.to(contador, { v: risco, duration: 0.9, ease: 'power2.out', onUpdate: () => { if (el) el.textContent = String(Math.round(contador.v)); } });
    });
  }, { scope: raiz, dependencies: [slug] });

  if (!m || !n) return null;

  return (
    <div ref={raiz} className="lp-superficie rounded-3xl p-5 sm:p-6 text-left" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{CIDADE_BAIXADA.nome}</p>
          <p className="lp-titulo mt-0.5 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{m.nome}</p>
        </div>
        <MapPin size={20} style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="lp-mono text-4xl font-semibold" style={{ color: 'var(--text-primary)' }} data-total>{risco}</p>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>trechos que costumam alagar, de {n.trechos} no mapa da cidade</p>
        </div>
        <div>
          <p className="lp-titulo text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{n.pontos}</p>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {n.pontos > 0 ? 'pontos onde já alagou, marcados no mapa' : 'pontos onde já alagou marcados até agora'}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        Fontes: Serviço Geológico do Brasil (áreas de risco de inundação) e notícias da região.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link to="/cadastro" className="sm:flex-1 whitespace-nowrap inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full text-sm font-semibold text-white bg-pulsar-600 hover:bg-pulsar-500 transition-colors">
          <Bell size={16} aria-hidden="true" /> Receber alertas {m.deNome}
        </Link>
        <Link to={`${PREFIXO_REGIAO}/${m.slug}`} className="whitespace-nowrap inline-flex items-center justify-center gap-1 h-11 px-4 rounded-full text-sm font-semibold border transition-colors hover:bg-[var(--bg-glass-hover)]"
          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-glass)' }}>
          Ver a cidade <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
