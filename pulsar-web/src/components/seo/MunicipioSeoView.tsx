import { Link } from 'react-router-dom';
import { CIDADE_BAIXADA, municipios, numerosDe, pontosDe, type MunicipioSeo } from '../../data/baixada-seo';
import { PREFIXO_REGIAO } from '../../data/regioes-seo';

// Mesmo desenho da página de subprefeitura (RegiaoSeoPage), com os números da Baixada:
// trechos que costumam alagar e pontos onde já alagou, nada de "alagamentos registrados".
const h1Style = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(28px, 5vw, 42px)', color: 'var(--text-primary)' };
const h2Style = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--text-primary)' };
const navH2Style = { fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' };
const linkStyle = { color: 'var(--text-accent)', textDecoration: 'underline', textUnderlineOffset: 2 };

/** "2025-08-06" -> "06/08/2025", por fatia de string (sem Date, sem fuso). */
const fmtData = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

export default function MunicipioSeoView({ municipio }: { municipio: MunicipioSeo }) {
  const { slug, nome, emNome, deNome } = municipio;
  const n = numerosDe(slug)!;
  const pontos = pontosDe(slug);
  const recente = pontos[0];
  const outras = municipios.filter((m) => m.slug !== slug);

  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section" style={{ maxWidth: 820 }}>
        <nav aria-label="breadcrumb" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Início</Link> ·{' '}
          <Link to={CIDADE_BAIXADA.path} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
            {CIDADE_BAIXADA.nome}
          </Link>{' '}
          · <span style={{ color: 'var(--text-primary)' }}>{nome}</span>
        </nav>

        <h1 className="mt-4 leading-tight" style={h1Style}>
          Risco de alagamento {emNome}
        </h1>
        <p className="mt-3 max-w-2xl" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {n.trechosRisco} dos {n.trechos} trechos {deNome} ficam em área de risco de inundação. A chuva vem das estações do CEMADEN e os alertas, da Defesa Civil.
        </p>

        <section className="mt-10" aria-labelledby="onde-alaga">
          <h2 id="onde-alaga" style={h2Style}>Onde costuma alagar {emNome}</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="landing-stat">
              <div className="landing-stat-num">{n.trechosRisco}</div>
              <div className="landing-stat-label">trechos que costumam alagar</div>
              <div className="landing-stat-sub">de {n.trechos} no mapa da cidade</div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-num">{n.pontos}</div>
              <div className="landing-stat-label">pontos onde já alagou</div>
              <div className="landing-stat-sub">marcados no mapa</div>
            </div>
            {recente && (
              <div className="landing-stat">
                <div className="landing-stat-num whitespace-nowrap" style={{ fontSize: 'clamp(26px, 3.4vw, 34px)' }}>
                  <time dateTime={recente.data}>{fmtData(recente.data)}</time>
                </div>
                <div className="landing-stat-label">alagamento mais recente marcado</div>
                <div className="landing-stat-sub">{recente.nome}</div>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {recente
              ? 'Fontes: áreas de risco de inundação do Serviço Geológico do Brasil e notícias da região, com o link de cada uma.'
              : 'Fonte: áreas de risco de inundação do Serviço Geológico do Brasil.'}
          </p>

          {recente ? (
            <>
              <h3 id="pontos-titulo" className="mt-8" style={{ ...navH2Style, fontWeight: 700, fontSize: 19 }}>Pontos onde já alagou</h3>
              <ul aria-labelledby="pontos-titulo" className="mt-3">
                {pontos.map((p) => (
                  <li key={`${p.nome}-${p.data}`} className="flex items-baseline justify-between gap-3 py-3" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <span className="min-w-0">
                      <span className="block font-semibold" style={{ color: 'var(--text-primary)' }}>{p.nome}</span>
                      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        Alagou em <time dateTime={p.data}>{fmtData(p.data)}</time>
                      </span>
                    </span>
                    <a href={p.fonte} target="_blank" rel="noopener" className="flex-none text-[13px]" style={linkStyle}>
                      Ver a notícia<span className="sr-only"> sobre {p.nome}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Ainda não marcamos nenhum ponto onde já alagou {emNome}.
            </p>
          )}
        </section>

        <section className="landing-prose mt-10">
          <h2>Como o Pulsar ajuda</h2>
          <p><strong>O que é risco de alagamento:</strong> a combinação de chuva forte, solo saturado e escoamento que pode causar pontos de alagamento e transtorno na mobilidade.</p>
          <p><strong>Como calculamos:</strong> o Pulsar mede três perigos por cidade, com dados coletados a cada 15 minutos: alagamento (chuva da última hora, das últimas 3 horas e acumulada em 48 horas, mais as áreas de risco de inundação do Serviço Geológico do Brasil), vento forte e calor extremo. A chuva de cada trecho é a medida pelas estações do CEMADEN a até 5 km dele; onde não há estação, vale a estimativa do OpenWeatherMap, que também dá o vento e a temperatura. O risco exibido é o pior dos três.</p>
          <p><strong>O que fazer em Alerta:</strong> evite áreas historicamente alagáveis, replaneje deslocamentos e acompanhe o alerta do Pulsar.</p>
        </section>

        <div className="landing-cta-band mt-10">
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            Veja o risco de agora {emNome}
          </p>
          <Link to={`/cadastro?regiao=${slug}`} className="landing-cta mt-5">
            Ver risco ao vivo {emNome}
          </Link>
        </div>

        <nav className="mt-12" aria-label="Outras cidades da Baixada">
          <h2 style={navH2Style}>Outras cidades da Baixada</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {outras.map((m) => (
              <li key={m.slug}>
                <Link to={`${PREFIXO_REGIAO}/${m.slug}`} style={linkStyle}>{m.nome}</Link>
              </li>
            ))}
            <li><Link to={CIDADE_BAIXADA.path} style={linkStyle}>{CIDADE_BAIXADA.nome}</Link></li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
