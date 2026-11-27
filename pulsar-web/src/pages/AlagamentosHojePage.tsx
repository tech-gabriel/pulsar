import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { horaCurta, quandoAtualizado } from '../utils/data';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { PALETA } from '../utils/paleta';
import { normalizarNome } from '../utils/texto';
import { CIDADE_BAIXADA, municipios, numerosDe, type MunicipioSeo } from '../data/baixada-seo';
import type { PontoCritico } from '../features/cidade/pontosCriticos';
import {
  municipioDoPonto, municipioPorNome, periodoLegivel, pontosDaSubprefeitura, pontosPerto, slugPorNomeApi, subprefeituraDoDistrito, subprefeituraDoPonto,
  type Periodo, type Ponto,
} from '../features/alagamentosHoje/regras';
import type { RiscoAgoraPublico } from '../types';

// O mapa (MapLibre) só baixa depois da escolha: a página e o Google não pagam por ele.
const MapaPerto = lazy(() => import('../features/alagamentosHoje/MapaPerto'));

const PATH = '/pontos-de-alagamento-hoje';
const ORIGEM = 'alagamentos-hoje';

type Coordenada = { lat: number; lon: number };
/** O que a pessoa escolheu: uma subprefeitura da capital ou um município da Baixada. */
type Regiao =
  | { tipo: 'subprefeitura'; area: SubprefeituraSeo; centro?: Coordenada }
  | { tipo: 'municipio'; area: MunicipioSeo };
type EstadoLocalizacao = 'ocioso' | 'procurando' | 'negada' | 'indisponivel' | 'semResposta' | 'fora' | 'semContorno';

/** Sem resposta do navegador nesse tempo, a pessoa ignorou o pedido (o timeout da API só conta depois do sim). */
const ESPERA_LOCALIZACAO_MS = 20_000;

const OPCOES = [...new Set([...subprefeituras.flatMap((s) => s.distritos), ...municipios.map((m) => m.nome)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/** "na Mooca" vira "a Mooca"; "em Itaquera" vira "Itaquera" (para "Ver a Mooca no mapa"). */
const comArtigo = (area: { emNome: string }) => area.emNome.replace(/^na /, 'a ').replace(/^no /, 'o ').replace(/^em /, '');

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
    title: 'Pontos de alagamento hoje em SP e na Baixada Santista · Pulsar',
    descricao: 'Veja o risco de alagamento agora na sua região de São Paulo ou da Baixada Santista, as ruas alagadas neste momento e onde costuma alagar perto de você.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Pontos de alagamento hoje em SP e na Baixada Santista', url: `https://app-pulsar.com.br${PATH}` },
  });

  const { usuario } = useAuth();
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [localizacao, setLocalizacao] = useState<EstadoLocalizacao>('ocioso');
  const [coords, setCoords] = useState<Coordenada | null>(null);
  const [bairro, setBairro] = useState('');

  const tipo = regiao?.tipo;
  const dados: DadosDaPagina = {
    contornoSp: useJsonPublico<FeatureCollection>('/subprefeituras-leve.geojson', coords !== null || tipo === 'subprefeitura'),
    contornoBaixada: useJsonPublico<FeatureCollection>('/baixada-santista-leve.geojson', coords !== null || tipo === 'municipio'),
    pontosSp: useJsonPublico<{ periodo: Periodo; pontos: Ponto[] }>('/pontos-alagamento.json', tipo === 'subprefeitura'),
    pontosBaixada: useJsonPublico<PontoCritico[]>('/pontos-criticos-baixada.json', tipo === 'municipio'),
  };
  const risco = useRiscoAgora(regiao !== null);

  // Localização chegou: resolve a subprefeitura ou o município pelos contornos (ajuste durante o render).
  // Só diz "fora" com os dois contornos na mão; sem um deles, nunca fica "procurando" para sempre.
  if (coords && localizacao === 'procurando') {
    const { contornoSp, contornoBaixada } = dados;
    const sub = contornoSp.dados ? subprefeituraDoPonto(coords.lat, coords.lon, contornoSp.dados) : null;
    const mun = !sub && contornoBaixada.dados ? municipioDoPonto(coords.lat, coords.lon, contornoBaixada.dados) : null;
    const respondeu = (c: { dados: unknown; erro: boolean }) => c.dados !== null || c.erro;
    if (sub || mun || (respondeu(contornoSp) && respondeu(contornoBaixada))) {
      if (sub) setRegiao({ tipo: 'subprefeitura', area: sub, centro: coords });
      else if (mun) setRegiao({ tipo: 'municipio', area: mun });
      setLocalizacao(sub || mun ? 'ocioso' : contornoSp.erro || contornoBaixada.erro ? 'semContorno' : 'fora');
      setCoords(null);
    }
  }

  // Cada pedido de localização ganha um número; resposta de pedido antigo (ou chegada depois de
  // a pessoa escolher o bairro) é ignorada.
  const pedidoGeo = useRef(0);
  const esperaGeo = useRef<number | undefined>(undefined);
  function encerrarPedido() {
    pedidoGeo.current++;
    window.clearTimeout(esperaGeo.current);
  }

  function pedirLocalizacao() {
    encerrarPedido();
    if (!('geolocation' in navigator)) {
      setLocalizacao('indisponivel');
      return;
    }
    const id = pedidoGeo.current;
    const valendo = () => pedidoGeo.current === id;
    setLocalizacao('procurando');
    esperaGeo.current = window.setTimeout(() => {
      if (!valendo()) return;
      encerrarPedido();
      setCoords(null);
      setLocalizacao('semResposta');
    }, ESPERA_LOCALIZACAO_MS);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!valendo()) return;
        window.clearTimeout(esperaGeo.current);
        track.usouGeolocalizacao(true);
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      (e) => {
        if (!valendo()) return;
        encerrarPedido();
        track.usouGeolocalizacao(false);
        // 1 = a pessoa (ou o navegador) negou; 2 e 3 = sem sinal ou demorou: tentar de novo pode dar certo.
        setLocalizacao(e.code === 1 ? 'negada' : 'indisponivel');
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  /** Só confirma numa escolha explícita (item da lista, Enter, sair do campo), nunca no meio da digitação. */
  function escolherBairro(valor: string) {
    const sub = subprefeituraDoDistrito(valor) ?? subprefeituras.find((s) => normalizarNome(s.nome) === normalizarNome(valor));
    const mun = sub ? undefined : municipioPorNome(valor);
    if (sub || mun) {
      encerrarPedido();
      setCoords(null);
      setRegiao(sub ? { tipo: 'subprefeitura', area: sub } : { tipo: 'municipio', area: mun! });
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
          <h1>Pontos de alagamento hoje em SP e na Baixada</h1>
          <p>O risco agora na sua região, as ruas alagadas neste momento e onde costuma alagar perto de você.</p>
        </header>

        {regiao ? (
          <RegiaoEscolhida
            vista={vistaDa(regiao, dados)}
            risco={risco}
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
            <li><Link to={CIDADE_BAIXADA.path}>{CIDADE_BAIXADA.nome}</Link></li>
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
      {localizacao === 'negada' && <p className="ah-aviso" role="status">A localização está bloqueada neste navegador. Escolha o bairro abaixo.</p>}
      {localizacao === 'indisponivel' && <p className="ah-aviso" role="status">Não deu para achar a sua localização agora. Escolha o bairro abaixo ou tente de novo.</p>}
      {localizacao === 'semResposta' && <p className="ah-aviso" role="status">A localização não respondeu. Escolha o bairro abaixo ou tente de novo.</p>}
      {localizacao === 'fora' && <p className="ah-aviso" role="status">Esse lugar fica fora das cidades que o Pulsar cobre. Escolha um bairro de São Paulo ou uma cidade da Baixada Santista.</p>}
      {localizacao === 'semContorno' && <p className="ah-aviso" role="status">Não deu para achar a sua região agora. Escolha o bairro abaixo.</p>}
      <label className="ah-campo">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Bairro ou cidade</span>
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
          placeholder="Ou digite o bairro ou a cidade"
          autoComplete="off"
        />
      </label>
      <datalist id="ah-distritos">
        {OPCOES.map((d) => <option key={d} value={d} />)}
      </datalist>
      <p className="ah-privacidade"><LockKeyhole size={14} aria-hidden="true" /> A localização fica no seu aparelho, só para achar a sua região.</p>
    </div>
  );
}

type Carga<T> = { dados: T | null; erro: boolean };
interface DadosDaPagina {
  contornoSp: Carga<FeatureCollection>;
  contornoBaixada: Carga<FeatureCollection>;
  pontosSp: Carga<{ periodo: Periodo; pontos: Ponto[] }>;
  pontosBaixada: Carga<PontoCritico[]>;
}

/** O que a região escolhida mostra. É o único lugar que sabe se ela é da capital ou da Baixada. */
interface Vista {
  area: { slug: string; nome: string; emNome: string; deNome: string };
  /** O item desta área na resposta do risco agora (a API devolve pelo nome). */
  ehDaArea: (r: RiscoAgoraPublico) => boolean;
  /** O CGE só cobre a capital. */
  mostraCge: boolean;
  pontos: ReactNode;
}

function vistaDa(regiao: Regiao, d: DadosDaPagina): Vista {
  if (regiao.tipo === 'municipio') {
    const mun = regiao.area;
    return {
      area: mun,
      ehDaArea: (r) => normalizarNome(r.nome) === normalizarNome(mun.nome),
      mostraCge: false,
      pontos: <PontosDoMunicipio mun={mun} pontos={d.pontosBaixada} contorno={d.contornoBaixada.dados} />,
    };
  }
  const { area: sub, centro } = regiao;
  return {
    area: sub,
    ehDaArea: (r) => slugPorNomeApi(r.nome) === sub.slug,
    mostraCge: true,
    pontos: <PontosDaSubprefeitura sub={sub} centro={centro} pontos={d.pontosSp} contorno={d.contornoSp.dados} />,
  };
}

function RegiaoEscolhida({ vista, risco, logado, onTrocar }: {
  vista: Vista;
  risco: { dados: RiscoAgoraPublico[] | null; erro: boolean; carregando: boolean; atualizar: () => void };
  logado: boolean;
  onTrocar: () => void;
}) {
  const { area } = vista;
  const atual = risco.dados?.find(vista.ehDaArea) ?? null;
  // Sem score a faixa da API cai em BAIXO por padrão, e área fora da resposta não tem leitura nenhuma:
  // nunca afirmar "Tranquilo" sem leitura.
  const semLeitura = atual ? atual.score == null : risco.dados !== null;
  const destino = logado ? `/app?regiao=${area.slug}` : `/cadastro?regiao=${area.slug}`;
  const aoConvidar = () => track.clicouConviteRegiao(ORIGEM, area.slug, logado);

  return (
    <>
      <button type="button" className="ah-pilula" onClick={onTrocar}>
        <MapPin size={16} aria-hidden="true" /> {area.nome} <ChevronDown size={16} aria-hidden="true" />
        <span className="sr-only">, trocar a região</span>
      </button>

      <section className="ah-risco" aria-label={`Risco agora ${area.emNome}`}>
        <p className="ah-risco-titulo">Risco agora {area.emNome}</p>
        {semLeitura ? (
          <p className="ah-erro" role="status">Sem leitura agora {area.emNome}. O risco volta a aparecer na próxima coleta.</p>
        ) : atual ? (
          <>
            <div className="det-hero" style={{ '--c': coresParaFaixa(atual.faixaRisco).fill } as React.CSSProperties}>
              <span className="det-hero-num" aria-label={`Score ${Math.round(atual.score ?? 0)} de 100`}>{Math.round(atual.score ?? 0)}</span>
              <div className="min-w-0">
                <p className="det-hero-faixa">{labelFaixa(atual.faixaRisco)}</p>
                <p className="det-hero-frase">
                  {motivoDoRisco({ faixa: atual.faixaRisco, perigoPrincipal: atual.perigoPrincipal, chuva3hMm: atual.chuva3hMm, chuva3hMedidaMm: atual.chuva3hMedidaMm, ventoKmH: atual.ventoKmH, sensacaoTermica: atual.sensacaoTermica, nome: atual.nome }) ?? 'Nada fora do normal agora'}
                </p>
              </div>
            </div>
            <p className="ah-meta">{atual.atualizadoEmUtc ? `Atualizado ${quandoAtualizado(atual.atualizadoEmUtc)}` : 'Ainda sem leitura'}</p>
            {!logado && (
              <Link to={destino} className="ah-link-forte" onClick={aoConvidar}>
                <Bell size={16} aria-hidden="true" /> Avise-me quando piorar <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </>
        ) : risco.erro ? (
          <div className="ah-erro" role="status">
            <p>Não deu para carregar o risco agora.</p>
            <button type="button" onClick={risco.atualizar} disabled={risco.carregando}>{risco.carregando ? 'Tentando…' : 'Tentar de novo'}</button>
          </div>
        ) : (
          <p className="ah-meta" role="status">Carregando o risco agora…</p>
        )}
      </section>

      {vista.mostraCge && atual && atual.alagamentosCge.length > 0 && (
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

      {vista.pontos}

      <section className="ah-convite" aria-labelledby="ah-convite">
        <h2 id="ah-convite">{logado ? `Acompanhe ${comArtigo(area)} no Pulsar` : `Receba o alerta ${area.deNome} no celular`}</h2>
        <p>Só quando {comArtigo(area)} entrar em Atenção ou Alerta. Fora isso, silêncio.</p>
        <Link to={destino} className="landing-cta ah-cta-cheio" onClick={aoConvidar}>
          {logado ? `Ver ${comArtigo(area)} no mapa` : 'Criar conta grátis'}
        </Link>
        {!logado && <p className="ah-entrar">Já tem conta? <Link to={`/login`}>Entrar</Link></p>}
      </section>
    </>
  );
}

/** Chunk do mapa que não baixa (deploy novo, rede caindo) ou WebGL que falha não derruba a página. */
function MapaProtegido({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<p className="mapa-perto ah-mapa-erro" role="status">Não deu para abrir o mapa agora. A contagem acima continua valendo.</p>}>
      <Suspense fallback={<div className="mapa-perto" aria-hidden="true" />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/** Capital: alagamentos registrados pela Defesa Civil (GeoSampa), na subprefeitura ou a até 2 km de você. */
function PontosDaSubprefeitura({ sub, centro, pontos, contorno }: {
  sub: SubprefeituraSeo; centro?: Coordenada; pontos: Carga<{ periodo: Periodo; pontos: Ponto[] }>; contorno: FeatureCollection | null;
}) {
  const { dados } = pontos;
  const perto = useMemo(
    () => (dados ? (centro ? pontosPerto(dados.pontos, centro) : pontosDaSubprefeitura(dados.pontos, sub.slug)) : []),
    [dados, centro, sub.slug],
  );
  return (
    <section className="ah-secao" aria-labelledby="ah-perto">
      <h2 id="ah-perto">
        {!dados
          ? (pontos.erro ? 'Não deu para carregar os alagamentos registrados' : 'Carregando os alagamentos registrados…')
          : `${perto.length === 0 ? 'Nenhum alagamento registrado' : plural(perto.length, 'alagamento registrado', 'alagamentos registrados')} ${centro ? 'a até 2 km de você' : sub.emNome}`}
      </h2>
      {dados && (
        <p className="ah-apoio">
          Ocorrências da Defesa Civil {periodoLegivel(dados.periodo)}. Mostram onde costuma alagar, não o que está alagado agora.
        </p>
      )}
      <MapaProtegido>
        <MapaPerto pontos={perto} centro={centro} nomeSubprefeitura={sub.nome} contorno={contorno} />
      </MapaProtegido>
      <div className="ah-legenda">
        <span><i style={{ background: PALETA.azul }} /> Alagamento</span>
        <span><i style={{ background: PALETA.azulProfundo }} /> Inundação</span>
        {centro && <span><i style={{ background: PALETA.voce }} /> Você</span>}
        {centro && <span><b /> 2 km</span>}
      </div>
    </section>
  );
}

/** Baixada: os pontos onde já alagou, da lista curada. O número vem do snapshot, o lugar de cada um do JSON público. */
function PontosDoMunicipio({ mun, pontos, contorno }: { mun: MunicipioSeo; pontos: Carga<PontoCritico[]>; contorno: FeatureCollection | null }) {
  const total = numerosDe(mun.slug)?.pontos ?? 0;
  const noMapa = useMemo(
    () => (pontos.dados ?? []).filter((p) => p.municipio === mun.nome).map((p) => ({ lat: p.lat, lon: p.lon, tipo: 'ALAGAMENTO' as const })),
    [pontos.dados, mun.nome],
  );
  // O mapa enquadra os pontos uma vez, ao nascer: com ponto marcado, ele espera a lista chegar.
  const esperando = total > 0 && !pontos.dados && !pontos.erro;
  return (
    <section className="ah-secao" aria-labelledby="ah-perto">
      <h2 id="ah-perto">
        {total === 0
          ? `Ainda não marcamos nenhum ponto onde já alagou ${mun.emNome}`
          : `${plural(total, 'ponto onde já alagou', 'pontos onde já alagou')} ${mun.emNome}`}
      </h2>
      {total > 0 && <p className="ah-apoio">Marcados a partir de notícias da região. Mostram onde costuma alagar, não o que está alagado agora.</p>}
      {esperando ? (
        <div className="mapa-perto" aria-hidden="true" />
      ) : (
        <MapaProtegido>
          <MapaPerto pontos={noMapa} nomeSubprefeitura={mun.nome} contorno={contorno} enquadrarPontos />
        </MapaProtegido>
      )}
      {total > 0 && (
        <div className="ah-legenda">
          <span><i style={{ background: PALETA.azul }} /> Ponto onde já alagou</span>
        </div>
      )}
    </section>
  );
}
