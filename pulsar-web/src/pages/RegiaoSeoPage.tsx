import { Link, useParams } from 'react-router-dom';
import { getRegiaoView } from '../data/regiao-view';
import { zonas, PREFIXO_REGIAO } from '../data/regioes-seo';
import { useSeoHead } from '../hooks/useSeoHead';

const FAIXA_LABEL: Record<string, string> = {
  BAIXO: 'baixo', MODERADO: 'moderado', ALTO: 'alto',
};

/**
 * Página pública de SEO por zona (/risco-de-alagamento/:zona). Conteúdo templated
 * + agregados reais do snapshot, tudo em HTML estático (prerenderizado). O risco
 * AO VIVO não fica aqui: é a isca do CTA para o cadastro (deep-link da zona).
 */
export default function RegiaoSeoPage() {
  const { zona: slug } = useParams<{ zona: string }>();
  const view = slug ? getRegiaoView(slug) : undefined;

  // useSeoHead precisa ser chamado incondicionalmente (regra dos hooks) mesmo
  // quando a zona não existe, então o head da página "não encontrada" também
  // é calculado aqui.
  const path = `${PREFIXO_REGIAO}/${slug ?? ''}`;
  const title = view ? `Risco de alagamento na ${view.nome} · Pulsar` : 'Região não encontrada · Pulsar';
  const descricao = view
    ? `Acompanhe o risco de chuva forte e alagamento na ${view.nome} de São Paulo por subprefeitura, com alerta antecipado do Pulsar.`
    : 'Esta região não existe no Pulsar. Veja as zonas de risco de alagamento de São Paulo.';
  const jsonLd = view
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: descricao,
        url: `https://app-pulsar.com.br${path}`,
        about: { '@type': 'Place', name: `${view.nome}, São Paulo` },
      }
    : undefined;

  useSeoHead({ title, descricao, path, jsonLd });

  if (!view) {
    return (
      <div className="auth-bg" style={{ minHeight: '100vh' }}>
        <main className="landing-section text-center" style={{ maxWidth: 640 }}>
          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 34px)', color: 'var(--text-primary)' }}
          >
            Região não encontrada
          </h1>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
            Veja as{' '}
            <Link to="/" style={{ color: 'var(--text-accent)', textDecoration: 'underline' }}>
              zonas de São Paulo no Pulsar
            </Link>.
          </p>
        </main>
      </div>
    );
  }

  const { nome, subprefeituras, snapshot, janelaDias } = view;
  const outrasZonas = zonas.filter((z) => z.slug !== slug);

  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section" style={{ maxWidth: 820 }}>
        <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Início</Link> ·{' '}
          <span>Risco de alagamento</span> · <span style={{ color: 'var(--text-primary)' }}>{nome}</span>
        </nav>

        <h1
          className="mt-4 leading-tight"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(28px, 5vw, 42px)', color: 'var(--text-primary)' }}
        >
          Risco de alagamento na {nome}
        </h1>
        <p className="mt-3 max-w-2xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          A {nome} de São Paulo reúne {subprefeituras.length} subprefeitura{subprefeituras.length > 1 ? 's' : ''}.
          O Pulsar calcula o risco de chuva forte e alagamento em cada uma, com alerta antecipado.
        </p>

        {snapshot && (
          <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Panorama recente">
            <div className="landing-stat">
              <div className="landing-stat-num">{snapshot.diasRiscoAlto}</div>
              <div className="landing-stat-label">dias de risco alto</div>
              <div className="landing-stat-sub">nos últimos {janelaDias} dias</div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-num">{snapshot.chuvaAcumuladaMm} mm</div>
              <div className="landing-stat-label">chuva acumulada estimada</div>
              <div className="landing-stat-sub">no período</div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-num" style={{ textTransform: 'capitalize' }}>
                {FAIXA_LABEL[snapshot.faixaPredominante]}
              </div>
              <div className="landing-stat-label">nível de risco predominante</div>
              <div className="landing-stat-sub">na janela recente</div>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--text-primary)' }}
          >
            Subprefeituras da {nome}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {subprefeituras.map((s) => (
              <li key={s} className="landing-pill">{s}</li>
            ))}
          </ul>
        </section>

        <section className="landing-prose mt-10">
          <h2>Como o Pulsar ajuda</h2>
          <p><strong>O que é risco de alagamento:</strong> a combinação de chuva forte, solo saturado e escoamento que pode causar pontos de alagamento e transtorno na mobilidade.</p>
          <p><strong>Como calculamos:</strong> cruzamos chuva, vento e outras variáveis por subprefeitura, gerando um score de risco atualizado ao longo do dia.</p>
          <p><strong>O que fazer em risco alto:</strong> evite áreas historicamente alagáveis, replaneje deslocamentos e acompanhe o alerta do Pulsar.</p>
        </section>

        <div className="landing-cta-band mt-10">
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            Veja o risco de agora da {nome}
          </p>
          <Link to={`/cadastro?regiao=${slug}`} className="landing-cta mt-5">
            Ver risco ao vivo da {nome}
          </Link>
        </div>

        <nav className="mt-12" aria-label="Outras zonas">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' }}
          >
            Outras zonas de São Paulo
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {outrasZonas.map((z) => (
              <li key={z.slug}>
                <Link
                  to={`${PREFIXO_REGIAO}/${z.slug}`}
                  style={{ color: 'var(--text-accent)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  {z.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
