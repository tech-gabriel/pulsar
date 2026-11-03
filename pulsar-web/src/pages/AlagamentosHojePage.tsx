import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FeatureCollection } from 'geojson';
import { ArrowRight, Bell, ChevronDown, Droplets, LockKeyhole, MapPin, Navigation, Search, TriangleAlert } from 'lucide-react';
import { getSubprefeituraPorSlug, PREFIXO_REGIAO, subprefeituras, zonas, type SubprefeituraSeo } from '../data/regioes-seo';
import ocorrenciasSnapshot from '../data/ocorrencias-snapshot.json';
import { useSeoHead } from '../hooks/useSeoHead';
import { useRiscoAgora } from '../hooks/useRiscoAgora';
import { useJsonPublico } from '../hooks/useJsonPublico';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../analytics/events';
import { coresParaFaixa, labelFaixa, motivoDoRisco } from '../utils/risco';
import { horaCurta } from '../utils/data';
import { PALETA } from '../utils/paleta';
import { normalizarNome } from '../utils/texto';
import {
  periodoLegivel, pontosDaSubprefeitura, pontosPerto, slugPorNomeApi, subprefeituraDoDistrito, subprefeituraDoPonto,
  type Periodo, type Ponto,
} from '../features/alagamentosHoje/regras';
import type { RiscoAgoraPublico } from '../types';

// O mapa (MapLibre) só baixa depois da escolha: a página e o Google não pagam por ele.
const MapaPerto = lazy(() => import('../features/alagamentosHoje/MapaPerto'));

const PATH = '/pontos-de-alagamento-hoje';
const ORIGEM = 'alagamentos-hoje';

interface Regiao {
  sub: SubprefeituraSeo;
  centro?: { lat: number; lon: number };
}
type EstadoLocalizacao = 'ocioso' | 'procurando' | 'negada' | 'fora' | 'semContorno';

const DISTRITOS = [...new Set(subprefeituras.flatMap((s) => s.distritos))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/** "na Mooca" vira "a Mooca"; "em Itaquera" vira "Itaquera" (para "Ver a Mooca no mapa"). */
const comArtigo = (sub: SubprefeituraSeo) => sub.emNome.replace(/^na /, 'a ').replace(/^no /, 'o ').replace(/^em /, '');

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

/** Onde mais alagou: vem do snapshot do build, então está no HTML que o Google lê. */
const RANKING = Object.entries(ocorrenciasSnapshot.subprefeituras as Record<string, { total: number }>)
  .map(([slug, s]) => ({ sub: getSubprefeituraPorSlug(slug), total: s.total }))
  .filter((r): r is { sub: SubprefeituraSeo; total: number } => !!r.sub)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5);
const PERIODO_SNAPSHOT = periodoLegivel(ocorrenciasSnapshot.periodo as Periodo);

export default function AlagamentosHojePage() {
  useSeoHead({
    path: PATH,
    title: 'Pontos de alagamento em SP hoje · Pulsar',
    descricao: 'Veja o risco de alagamento agora na sua região de São Paulo, as ruas alagadas neste momento e onde costuma alagar perto de você.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Pontos de alagamento em SP hoje', url: `https://app-pulsar.com.br${PATH}` },
  });

  const { usuario } = useAuth();
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [localizacao, setLocalizacao] = useState<EstadoLocalizacao>('ocioso');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [bairro, setBairro] = useState('');

  const contorno = useJsonPublico<FeatureCollection>('/subprefeituras-leve.geojson', coords !== null || regiao !== null);
  const pontos = useJsonPublico<{ periodo: Periodo; pontos: Ponto[] }>('/pontos-alagamento.json', regiao !== null);
  const risco = useRiscoAgora(regiao !== null);

  // Localização chegou e o contorno também: resolve a subprefeitura (ajuste durante o render).
  if (coords && contorno.dados && localizacao === 'procurando') {
    const sub = subprefeituraDoPonto(coords.lat, coords.lon, contorno.dados);
    setLocalizacao(sub ? 'ocioso' : 'fora');
    if (sub) setRegiao({ sub, centro: coords });
    setCoords(null);
  }
  // O contorno não baixou: sem ele não dá para achar a subprefeitura. Nunca fica "procurando" para sempre.
  if (coords && contorno.erro && localizacao === 'procurando') {
    setLocalizacao('semContorno');
    setCoords(null);
  }

  function pedirLocalizacao() {
    if (!('geolocation' in navigator)) {
      setLocalizacao('negada');
      return;
    }
    setLocalizacao('procurando');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        track.usouGeolocalizacao(true);
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      () => {
        track.usouGeolocalizacao(false);
        setLocalizacao('negada');
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  /** Só confirma numa escolha explícita (item da lista, Enter, sair do campo), nunca no meio da digitação. */
  function escolherBairro(valor: string) {
    const sub = subprefeituraDoDistrito(valor) ?? subprefeituras.find((s) => normalizarNome(s.nome) === normalizarNome(valor));
    if (sub) {
      setRegiao({ sub });
      setLocalizacao('ocioso');
    }
  }

  return (
    <div className="auth-bg" style={{ minHeight: '100vh' }}>
      <main className="landing-section ah-pagina">
        <nav aria-label="breadcrumb" className="ah-trilha">
          <Link to="/">Início</Link> · Alagamentos hoje
        </nav>
        <header className="ah-cabeca">
          <h1>Pontos de alagamento em SP hoje</h1>
          <p>O risco agora na sua região, as ruas alagadas neste momento e onde costuma alagar perto de você.</p>
        </header>

        {regiao ? (
          <RegiaoEscolhida
            regiao={regiao}
            risco={risco}
            pontos={pontos.dados}
            pontosErro={pontos.erro}
            contorno={contorno.dados}
            logado={!!usuario}
            onTrocar={() => {
              setRegiao(null);
              setBairro('');
            }}
          />
        ) : (
          <>
            <Escolha
              localizacao={localizacao}
              bairro={bairro}
              onLocalizar={pedirLocalizacao}
              onDigitar={setBairro}
              onBairro={escolherBairro}
            />
            {RANKING[0]?.total > 0 && (
            <section className="ah-secao" aria-labelledby="ah-ranking">
              <h2 id="ah-ranking">Onde mais alagou em SP</h2>
              <p className="ah-apoio">Ocorrências registradas pela Defesa Civil {PERIODO_SNAPSHOT}.</p>
              <ol className="ah-ranking">
                {RANKING.map(({ sub, total }) => (
                  <li key={sub.slug}>
                    <div className="ah-ranking-linha">
                      <Link to={`${PREFIXO_REGIAO}/${sub.slug}`}>{sub.nome}</Link>
                      <span>{total.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="ah-barra"><span style={{ width: `${(total / RANKING[0].total) * 100}%` }} /></div>
                  </li>
                ))}
              </ol>
            </section>
            )}
          </>
        )}

        <nav className="ah-secao" aria-labelledby="ah-regioes">
          <h2 id="ah-regioes">Risco de alagamento por região</h2>
          <ul className="ah-regioes">
            {zonas.map((z) => (
              <li key={z.slug}><Link to={`${PREFIXO_REGIAO}/${z.slug}`}>{z.nome}</Link></li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}

function Escolha({ localizacao, bairro, onLocalizar, onDigitar, onBairro }: {
  localizacao: EstadoLocalizacao; bairro: string; onLocalizar: () => void; onDigitar: (v: string) => void; onBairro: (v: string) => void;
}) {
  return (
    <div className="ah-escolha">
      <button type="button" className="landing-cta ah-cta-cheio" onClick={onLocalizar} disabled={localizacao === 'procurando'}>
        <Navigation size={18} aria-hidden="true" /> {localizacao === 'procurando' ? 'Procurando você…' : 'Ver a minha região'}
      </button>
      {localizacao === 'negada' && <p className="ah-aviso" role="status">Sem acesso à localização. Escolha o bairro abaixo.</p>}
      {localizacao === 'fora' && <p className="ah-aviso" role="status">Esse lugar fica fora da cidade de São Paulo. Escolha um bairro da capital.</p>}
      {localizacao === 'semContorno' && <p className="ah-aviso" role="status">Não deu para achar a sua região agora. Escolha o bairro abaixo.</p>}
      <label className="ah-campo">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Bairro</span>
        <input
          list="ah-distritos"
          value={bairro}
          onChange={(e) => {
            onDigitar(e.target.value);
            // Item escolhido na lista (ou valor colado de uma vez) confirma; letra digitada não.
            const tipo = (e.nativeEvent as InputEvent).inputType;
            if (!tipo || tipo === 'insertReplacementText') onBairro(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && onBairro(e.currentTarget.value)}
          onBlur={(e) => onBairro(e.currentTarget.value)}
          placeholder="Ou digite o seu bairro"
          autoComplete="off"
        />
      </label>
      <datalist id="ah-distritos">
        {DISTRITOS.map((d) => <option key={d} value={d} />)}
      </datalist>
      <p className="ah-privacidade"><LockKeyhole size={14} aria-hidden="true" /> A localização fica no seu aparelho, só para achar a sua subprefeitura.</p>
    </div>
  );
}

function RegiaoEscolhida({ regiao, risco, pontos, pontosErro, contorno, logado, onTrocar }: {
  regiao: Regiao;
  risco: { dados: RiscoAgoraPublico[] | null; erro: boolean; atualizar: () => void };
  pontos: { periodo: Periodo; pontos: Ponto[] } | null;
  pontosErro: boolean;
  contorno: FeatureCollection | null;
  logado: boolean;
  onTrocar: () => void;
}) {
  const { sub, centro } = regiao;
  const atual = risco.dados?.find((r) => slugPorNomeApi(r.nome) === sub.slug) ?? null;
  const perto = useMemo(
    () => (pontos ? (centro ? pontosPerto(pontos.pontos, centro) : pontosDaSubprefeitura(pontos.pontos, sub.slug)) : []),
    [pontos, centro, sub.slug],
  );
  const destino = logado ? `/app?regiao=${sub.slug}` : `/cadastro?regiao=${sub.slug}`;
  const aoConvidar = () => track.clicouConviteRegiao(ORIGEM, sub.slug, logado);

  return (
    <>
      <button type="button" className="ah-pilula" onClick={onTrocar}>
        <MapPin size={16} aria-hidden="true" /> {sub.nome} <ChevronDown size={16} aria-hidden="true" />
        <span className="sr-only">, trocar a região</span>
      </button>

      <section className="ah-risco" aria-label={`Risco agora ${sub.emNome}`}>
        <p className="ah-risco-titulo">Risco agora {sub.emNome}</p>
        {atual && atual.score == null ? (
          // Sem score a faixa da API cai em BAIXO por padrão: nunca afirmar "Tranquilo" sem leitura.
          <p className="ah-erro" role="status">Sem leitura agora {sub.emNome}. O risco volta a aparecer na próxima coleta.</p>
        ) : atual ? (
          <>
            <div className="det-hero" style={{ '--c': coresParaFaixa(atual.faixaRisco).fill } as React.CSSProperties}>
              <span className="det-hero-num" aria-label={`Score ${Math.round(atual.score ?? 0)} de 100`}>{Math.round(atual.score ?? 0)}</span>
              <div className="min-w-0">
                <p className="det-hero-faixa">{labelFaixa(atual.faixaRisco)}</p>
                <p className="det-hero-frase">
                  {motivoDoRisco({ faixa: atual.faixaRisco, perigoPrincipal: atual.perigoPrincipal, chuva3hMm: atual.chuva3hMm, ventoKmH: atual.ventoKmH, sensacaoTermica: atual.sensacaoTermica }) ?? 'Nada fora do normal agora'}
                </p>
              </div>
            </div>
            <p className="ah-meta">{atual.atualizadoEmUtc ? `Atualizado às ${horaCurta(atual.atualizadoEmUtc)}` : 'Ainda sem leitura'}</p>
            {!logado && (
              <Link to={destino} className="ah-link-forte" onClick={aoConvidar}>
                <Bell size={16} aria-hidden="true" /> Avise-me quando piorar <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </>
        ) : risco.erro ? (
          <div className="ah-erro" role="status">
            <p>Não deu para carregar o risco agora.</p>
            <button type="button" onClick={risco.atualizar}>Tentar de novo</button>
          </div>
        ) : (
          <p className="ah-meta" role="status">Carregando o risco agora…</p>
        )}
      </section>

      {atual && atual.alagamentosCge.length > 0 && (
        <section className="ah-cartao" aria-label="Alagando agora">
          <p className="ah-cge-titulo"><TriangleAlert size={16} aria-hidden="true" /> Alagando agora</p>
          <ul className="ah-cge">
            {atual.alagamentosCge.map((p) => (
              <li key={`${p.via}-${p.inicioUtc}`}>
                <Droplets size={18} aria-hidden="true" />
                <div>
                  <p className="ah-cge-via">{p.via}</p>
                  <p className="ah-cge-info">
                    {[/[a-zA-ZÀ-ú]/.test(p.referencia) ? p.referencia : null, `desde ${horaCurta(p.inicioUtc)}`, p.transitavel ? 'transitável' : 'sem passagem'].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="ah-fonte">Fonte: CGE, da Prefeitura de São Paulo.</p>
        </section>
      )}

      <section className="ah-secao" aria-labelledby="ah-perto">
        <h2 id="ah-perto">
          {!pontos
            ? (pontosErro ? 'Não deu para carregar os alagamentos registrados' : 'Carregando os alagamentos registrados…')
            : `${perto.length === 0 ? 'Nenhum alagamento registrado' : plural(perto.length, 'alagamento registrado', 'alagamentos registrados')} ${centro ? 'a até 2 km de você' : sub.emNome}`}
        </h2>
        {pontos && (
          <p className="ah-apoio">
            Ocorrências da Defesa Civil {periodoLegivel(pontos.periodo)}. Mostram onde costuma alagar, não o que está alagado agora.
          </p>
        )}
        <Suspense fallback={<div className="mapa-perto" aria-hidden="true" />}>
          <MapaPerto pontos={perto} centro={centro} nomeSubprefeitura={sub.nome} contorno={contorno} />
        </Suspense>
        <div className="ah-legenda">
          <span><i style={{ background: PALETA.azul }} /> Alagamento</span>
          <span><i style={{ background: PALETA.azulProfundo }} /> Inundação</span>
          {centro && <span><i style={{ background: '#00BCFF' }} /> Você</span>}
          {centro && <span><b /> 2 km</span>}
        </div>
      </section>

      <section className="ah-convite" aria-labelledby="ah-convite">
        <h2 id="ah-convite">{logado ? `Acompanhe ${comArtigo(sub)} no Pulsar` : `Receba o alerta ${sub.deNome} no celular`}</h2>
        <p>Só quando {comArtigo(sub)} entrar em Atenção ou Alerta. Fora isso, silêncio.</p>
        <Link to={destino} className="landing-cta ah-cta-cheio" onClick={aoConvidar}>
          {logado ? `Ver ${comArtigo(sub)} no mapa` : 'Criar conta grátis'}
        </Link>
        {!logado && <p className="ah-entrar">Já tem conta? <Link to={`/login`}>Entrar</Link></p>}
      </section>
    </>
  );
}
