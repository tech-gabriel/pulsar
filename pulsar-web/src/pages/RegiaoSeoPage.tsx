import { Link, useParams } from 'react-router-dom';
import { getRegiaoView, getSubprefeituraView, type RegiaoView, type SubprefeituraView } from '../data/regiao-view';
import { zonas, subprefeituras, PREFIXO_REGIAO } from '../data/regioes-seo';
import { useSeoHead } from '../hooks/useSeoHead';
import { primeiraQueCabe } from '../utils/texto';

const ORIGIN = 'https://app-pulsar.com.br';

const FAIXA_LABEL: Record<string, string> = {
  BAIXO: 'baixo', MODERADO: 'moderado', ALTO: 'alto',
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-03" -> "mar/2026" */
const fmtMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
// Datas "AAAA-MM-DD" formatadas por fatia de string, sem Date: evita deslocamento de fuso.
/** "2026-05-11" -> "11/05" (o ano vai na legenda) */
const fmtDiaMes = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
/** "2026-05-11" -> "11/05/2026" */
const fmtData = (ymd: string) => `${fmtDiaMes(ymd)}/${ymd.slice(0, 4)}`;

// O bloco de estatísticas fica OCULTO até haver histórico suficiente. Por design,
// o banco só retém dados brutos recentes (poucos dias, para economizar espaço no
// Supabase), então "dias de risco alto / chuva nos últimos 90 dias" não tem lastro
// e sairia zerado e enganoso (ainda mais no inverno seco de SP). Reativar quando a
// frente de ROLLUP (agregado diário persistido, que não pesa no banco) alimentar o
// snapshot com histórico real — idealmente perto da estação chuvosa, quando os
// números ficam diferenciados por zona. Todo o pipeline (snapshot/merge/JSX) já
// está pronto; basta virar esta flag (ou torná-la data-driven pelo snapshot).
const ESTATISTICAS_PRONTAS = false;

const h1Style = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(28px, 5vw, 42px)', color: 'var(--text-primary)' };
const h2Style = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--text-primary)' };
const navH2Style = { fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' };
const linkStyle = { color: 'var(--text-accent)', textDecoration: 'underline', textUnderlineOffset: 2 };

/**
 * Página pública de SEO por zona ou subprefeitura (/risco-de-alagamento/:zona).
 * Os dois tipos dividem a mesma rota (slugs não colidem: zonas são "zona-*").
 * Conteúdo templated + curado + snapshots, tudo em HTML estático (prerenderizado).
 * O risco AO VIVO não fica aqui: é a isca do CTA para o cadastro (deep-link).
 */
export default function RegiaoSeoPage() {
  const { zona: slug = '' } = useParams<{ zona: string }>();
  const zona = getRegiaoView(slug);
  const sub = zona ? undefined : getSubprefeituraView(slug);

  // useSeoHead precisa ser chamado incondicionalmente (regra dos hooks), então o
  // head de todos os casos (zona, subprefeitura, não encontrada) é calculado aqui.
  const path = `${PREFIXO_REGIAO}/${slug}`;
  useSeoHead({ path, ...(zona ? headZona(zona, path) : sub ? headSub(sub, path) : headNaoEncontrada()) });

  if (zona) return <ZonaView view={zona} />;
  if (sub) return <SubprefeituraSeoView view={sub} />;
  return <NaoEncontrada />;
}

function headZona(view: RegiaoView, path: string) {
  const title = `Risco de alagamento na ${view.nome} · Pulsar`;
  const descricao = `Acompanhe o risco de chuva forte e alagamento na ${view.nome} de São Paulo por subprefeitura, com alerta antecipado do Pulsar.`;
  return {
    title,
    descricao,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: descricao,
      url: `${ORIGIN}${path}`,
      about: { '@type': 'Place', name: `${view.nome}, São Paulo` },
    },
  };
}

function headSub(view: SubprefeituraView, path: string) {
  const { nome, emNome, zona, distritos, ocorrencias, periodo, geradoEm } = view;
  const title = `Risco de alagamento ${emNome} (${zona.nome}, SP) · Pulsar`;
  const dado = ocorrencias && ocorrencias.total > 0 && periodo.de
    ? ` ${ocorrencias.total} ocorrência${ocorrencias.total > 1 ? 's' : ''} registrada${ocorrencias.total > 1 ? 's' : ''} pela Defesa Civil desde ${fmtMes(periodo.de.slice(0, 7))}.`
    : '';
  const risco = `Risco de chuva forte e alagamento ${emNome}`;
  // Do mais completo ao mais enxuto. Os distritos pegam a cauda longa ("alagamento
  // Tatuapé"); o número de ocorrências fica até o fim porque é o que faz clicar.
  const descricao = primeiraQueCabe([
    `${risco} (${distritos.join(', ')}).${dado} Alerta grátis do Pulsar.`,
    `${risco}.${dado} Alerta grátis do Pulsar.`,
    `${risco}.${dado}`,
  ]);
  const url = `${ORIGIN}${path}`;
  const zonaUrl = `${ORIGIN}${PREFIXO_REGIAO}/${zona.slug}`;
  return {
    title,
    descricao,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: title,
          description: descricao,
          url,
          dateModified: geradoEm,
          about: {
            '@type': 'Place',
            name: `${nome}, São Paulo`,
            containedInPlace: {
              '@type': 'Place',
              name: `${zona.nome}, São Paulo`,
              url: zonaUrl,
              containedInPlace: { '@type': 'City', name: 'São Paulo' },
            },
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: `${ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: zona.nome, item: zonaUrl },
            { '@type': 'ListItem', position: 3, name: nome, item: url },
          ],
        },
      ],
    },
  };
}

function headNaoEncontrada() {
  return {
    title: 'Região não encontrada · Pulsar',
    descricao: 'Esta região não existe no Pulsar. Veja as zonas de risco de alagamento de São Paulo.',
  };
}

function NaoEncontrada() {
  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section text-center" style={{ maxWidth: 640 }}>
        <h1 className="leading-tight" style={{ ...h1Style, fontSize: 'clamp(26px, 4vw, 34px)' }}>
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

function ComoAjuda() {
  return (
    <section className="landing-prose mt-10">
      <h2>Como o Pulsar ajuda</h2>
      <p><strong>O que é risco de alagamento:</strong> a combinação de chuva forte, solo saturado e escoamento que pode causar pontos de alagamento e transtorno na mobilidade.</p>
      <p><strong>Como calculamos:</strong> o Pulsar mede três perigos por subprefeitura, com dados meteorológicos do OpenWeatherMap coletados a cada 15 minutos: alagamento (chuva da última hora, das últimas 3 horas e acumulada em 48 horas, mais o histórico de ocorrências da região), vento forte e calor extremo. O risco exibido é o pior dos três.</p>
      <p><strong>O que fazer em risco alto:</strong> evite áreas historicamente alagáveis, replaneje deslocamentos e acompanhe o alerta do Pulsar.</p>
    </section>
  );
}

function Cta({ slug, emNome }: { slug: string; emNome: string }) {
  return (
    <div className="landing-cta-band mt-10">
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
        Veja o risco de agora {emNome}
      </p>
      <Link to={`/cadastro?regiao=${slug}`} className="landing-cta mt-5">
        Ver risco ao vivo {emNome}
      </Link>
    </div>
  );
}

function LinksNav({ titulo, itens }: { titulo: string; itens: { slug: string; nome: string }[] }) {
  return (
    <nav className="mt-12" aria-label={titulo}>
      <h2 style={navH2Style}>{titulo}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {itens.map((r) => (
          <li key={r.slug}>
            <Link to={`${PREFIXO_REGIAO}/${r.slug}`} style={linkStyle}>{r.nome}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ZonaView({ view }: { view: RegiaoView }) {
  const { slug, nome, snapshot, janelaDias } = view;
  const subsDaZona = subprefeituras.filter((s) => s.zonaSlug === slug);
  const outrasZonas = zonas.filter((z) => z.slug !== slug);

  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section" style={{ maxWidth: 820 }}>
        <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Início</Link> ·{' '}
          <span>Risco de alagamento</span> · <span style={{ color: 'var(--text-primary)' }}>{nome}</span>
        </nav>

        <h1 className="mt-4 leading-tight" style={h1Style}>
          Risco de alagamento na {nome}
        </h1>
        <p className="mt-3 max-w-2xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          A {nome} de São Paulo reúne {subsDaZona.length} subprefeitura{subsDaZona.length > 1 ? 's' : ''}.
          O Pulsar calcula o risco de chuva forte e alagamento em cada uma, com alerta antecipado.
        </p>

        {ESTATISTICAS_PRONTAS && snapshot && (
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
          <h2 style={h2Style}>Subprefeituras da {nome}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {subsDaZona.map((s) => (
              <li key={s.slug}>
                <Link to={`${PREFIXO_REGIAO}/${s.slug}`} className="landing-pill hover:underline">{s.nome}</Link>
              </li>
            ))}
          </ul>
        </section>

        <ComoAjuda />
        <Cta slug={slug} emNome={`da ${nome}`} />
        <LinksNav titulo="Outras zonas de São Paulo" itens={outrasZonas} />
      </main>
    </div>
  );
}

function SubprefeituraSeoView({ view }: { view: SubprefeituraView }) {
  const { slug, nome, emNome, zona, distritos, descricao, ocorrencias, periodo, geradoEm } = view;
  const vizinhas = subprefeituras.filter((s) => s.zonaSlug === zona.slug && s.slug !== slug);
  // Sé é a única da Zona Centro: sem vizinhas, cruza para as outras zonas.
  const links = vizinhas.length > 0
    ? { titulo: `Outras subprefeituras da ${zona.nome}`, itens: vizinhas }
    : { titulo: 'Outras zonas de São Paulo', itens: zonas.filter((z) => z.slug !== zona.slug) };

  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section" style={{ maxWidth: 820 }}>
        <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Início</Link> ·{' '}
          <Link to={`${PREFIXO_REGIAO}/${zona.slug}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
            {zona.nome}
          </Link>{' '}
          · <span style={{ color: 'var(--text-primary)' }}>{nome}</span>
        </nav>

        <h1 className="mt-4 leading-tight" style={h1Style}>
          Risco de alagamento {emNome}
        </h1>
        <p className="mt-3 max-w-2xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {descricao}
        </p>

        <section className="mt-10" aria-labelledby="ocorrencias">
          <h2 id="ocorrencias" style={h2Style}>Alagamentos registrados {emNome}</h2>
          {ocorrencias && ocorrencias.total > 0 && periodo.de && periodo.ate ? (
            <>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="landing-stat">
                  <div className="landing-stat-num">{ocorrencias.total}</div>
                  <div className="landing-stat-label">ocorrências de alagamento e inundação</div>
                  <div className="landing-stat-sub">de {fmtMes(periodo.de.slice(0, 7))} a {fmtMes(periodo.ate.slice(0, 7))}</div>
                </div>
                {ocorrencias.mesPico && (
                  <div className="landing-stat">
                    <div className="landing-stat-num">{fmtMes(ocorrencias.mesPico)}</div>
                    <div className="landing-stat-label">mês com mais registros</div>
                    <div className="landing-stat-sub">no período</div>
                  </div>
                )}
                {ocorrencias.ultima && (
                  <div className="landing-stat">
                    <div className="landing-stat-num">
                      <time dateTime={ocorrencias.ultima}>{fmtDiaMes(ocorrencias.ultima)}</time>
                    </div>
                    <div className="landing-stat-label">registro mais recente</div>
                    <div className="landing-stat-sub">em {ocorrencias.ultima.slice(0, 4)}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Nenhuma ocorrência de alagamento registrada pela Defesa Civil {emNome} no período mais recente
              disponível. Isso não elimina o risco: chuvas fortes podem causar pontos de alagamento em qualquer região.
            </p>
          )}
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Fonte: registros de ocorrências de alagamento e inundação da Defesa Civil de São Paulo,
            publicados no{' '}
            <a href="https://geosampa.prefeitura.sp.gov.br" target="_blank" rel="noopener" style={linkStyle}>
              GeoSampa
            </a>
            , o portal de dados geográficos da Prefeitura. Dados atualizados em{' '}
            <time dateTime={geradoEm}>{fmtData(geradoEm)}</time>.
          </p>
        </section>

        <section className="mt-10">
          <h2 style={h2Style}>Distritos {view.deNome}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {distritos.map((d) => (
              <li key={d} className="landing-pill">{d}</li>
            ))}
          </ul>
        </section>

        <ComoAjuda />
        <Cta slug={slug} emNome={emNome} />
        <LinksNav {...links} />
      </main>
    </div>
  );
}
