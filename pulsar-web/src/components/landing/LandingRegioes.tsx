import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { zonas, subprefeituras, PREFIXO_REGIAO } from '../../data/regioes-seo';
import { totalDe } from '../../data/landing-dados';

/**
 * As 5 zonas e as 32 subprefeituras, cada uma com link para a página pública dela.
 * É a ponte da home para as páginas de região (links internos que o Google segue).
 */
export default function LandingRegioes() {
  return (
    <section className="landing-section" aria-labelledby="regioes-titulo">
      <div data-revelar className="max-w-2xl">
        <p className="lp-rotulo">32 subprefeituras</p>
        <h2 id="regioes-titulo" className="lp-h2 mt-3">Veja o histórico da sua região</h2>
        <p className="mt-4 text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Cada página traz os alagamentos registrados pela Prefeitura e o que costuma pesar em dia de chuva.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((z) => (
          <nav key={z.slug} data-revelar aria-label={z.nome} className="lp-superficie rounded-3xl p-5">
            <Link to={`${PREFIXO_REGIAO}/${z.slug}`} className="lp-titulo group inline-flex items-center gap-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {z.nome} <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
            </Link>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {subprefeituras.filter((s) => s.zonaSlug === z.slug).map((s) => (
                <li key={s.slug}>
                  <Link to={`${PREFIXO_REGIAO}/${s.slug}`} className="lp-chip inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px]">
                    {s.nome}
                    <span className="lp-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{totalDe(s.slug)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p data-revelar className="mt-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        O número ao lado do nome é o total de alagamentos registrados no ano. Fonte: GeoSampa.
      </p>
    </section>
  );
}
