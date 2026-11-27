import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { zonas, subprefeituras, PREFIXO_REGIAO } from '../../data/regioes-seo';
import { totalDe } from '../../data/landing-dados';
import { CIDADE_BAIXADA, municipios, numerosDe } from '../../data/baixada-seo';
import type { CidadeLanding } from './LandingBento';

const TEXTOS = {
  sp: {
    rotulo: '32 subprefeituras',
    titulo: 'Veja o histórico da sua região',
    texto: 'Cada página traz os alagamentos registrados pela Prefeitura e o que costuma pesar em dia de chuva.',
    nota: 'O número ao lado do nome é o total de alagamentos registrados no ano. Fonte: GeoSampa.',
  },
  baixada: {
    rotulo: '9 cidades',
    titulo: 'Veja onde costuma alagar na sua cidade',
    texto: 'Cada página mostra os trechos que costumam alagar e os pontos onde já alagou.',
    nota: 'O número ao lado do nome é quantos trechos costumam alagar. Fonte: Serviço Geológico do Brasil.',
  },
};

function Chip({ slug, nome, numero }: { slug: string; nome: string; numero: number }) {
  return (
    <li>
      <Link to={`${PREFIXO_REGIAO}/${slug}`} className="lp-chip inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px]">
        {nome}{' '}
        <span className="lp-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{numero}</span>
      </Link>
    </li>
  );
}

/**
 * As 5 zonas e as 32 subprefeituras (ou os 9 municípios da Baixada), cada uma com link para a
 * página pública dela. É a ponte da landing para as páginas de região (links internos que o Google segue).
 */
export default function LandingRegioes({ cidade = 'sp' }: { cidade?: CidadeLanding }) {
  const t = TEXTOS[cidade];
  return (
    <section className="landing-section" aria-labelledby="regioes-titulo">
      <div data-revelar className="max-w-2xl">
        <p className="lp-rotulo">{t.rotulo}</p>
        <h2 id="regioes-titulo" className="lp-h2 mt-3">{t.titulo}</h2>
        <p className="mt-4 text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.texto}</p>
      </div>
      {cidade === 'baixada' ? (
        <nav data-revelar aria-label={CIDADE_BAIXADA.nome} className="mt-10 lp-superficie rounded-3xl p-5">
          <p className="lp-titulo text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{CIDADE_BAIXADA.nome}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {municipios.map((m) => <Chip key={m.slug} slug={m.slug} nome={m.nome} numero={numerosDe(m.slug)?.trechosRisco ?? 0} />)}
          </ul>
        </nav>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zonas.map((z) => (
            <nav key={z.slug} data-revelar aria-label={z.nome} className="lp-superficie rounded-3xl p-5">
              <Link to={`${PREFIXO_REGIAO}/${z.slug}`} className="lp-titulo group inline-flex items-center gap-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {z.nome} <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
              </Link>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {subprefeituras.filter((s) => s.zonaSlug === z.slug).map((s) => (
                  <Chip key={s.slug} slug={s.slug} nome={s.nome} numero={totalDe(s.slug)} />
                ))}
              </ul>
            </nav>
          ))}
        </div>
      )}
      <p data-revelar className="mt-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.nota}</p>
    </section>
  );
}
