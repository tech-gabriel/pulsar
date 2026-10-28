import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { GeoJsonObject, FeatureCollection } from 'geojson';
import { ChevronUp, ChevronDown, Layers } from 'lucide-react';
import MapaBase, { type PontoBusca } from '../components/mapa/MapaBase';
import BuscaUnificada from '../components/mapa/BuscaUnificada';
import LayerControl from '../components/mapa/LayerControl';
import MapLegend from '../components/mapa/MapLegend';
import PainelLateral from '../components/painel/PainelLateral';
import DetalheSubprefeitura from '../components/painel/DetalheSubprefeitura';
import ErrorBanner from '../components/ui/ErrorBanner';
import Header from '../components/ui/Header';
import type { Camada } from '../utils/camadas';
import { useAuth } from '../contexts/AuthContext';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useFavoritos } from '../hooks/useFavoritos';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotificacoesPrefs } from '../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { useInstalacao } from '../features/ativacao/useInstalacao';
import { jaViuAtivacao, precisaDeAtivacao } from '../features/ativacao/passos';
import ConvitePush from '../components/notificacoes/ConvitePush';
import BannerEscolherSubprefeituras from '../components/mapa/BannerEscolherSubprefeituras';
import { useGeolocalizacao, GeoError } from '../hooks/useGeolocalizacao';
import { resolverSelecao } from '../utils/selecaoPorPonto';
import { resumoAlertas } from '../utils/risco';
import { useToast } from '../contexts/ToastContext';
import { resolverDeepLink } from '../data/regioes-seo';
import OverlayAlagamentoToggle from '../components/mapa/OverlayAlagamentoToggle';
import CardAlagamentoProximo from '../components/mapa/CardAlagamentoProximo';
import { useOcorrenciasAlagamento } from '../hooks/useOcorrenciasAlagamento';
import { buscarOcorrenciasProximas, RAIO_PROXIMAS_M } from '../api/ocorrencias';
import type { SubprefeituraMapaDto, EnderecoBusca, OcorrenciasProximasDto } from '../types';
import { useAlturaFluida } from '../motion/useAlturaFluida';

export default function MapaPage() {
  const { usuario } = useAuth();
  const { subprefeituras, carregando, erro, recarregar, ultimaAtualizacao } = useSubprefeituras();
  const { favoritos, isFavorito, toggleFavorito, carregando: carregandoFavoritos } = useFavoritos();
  const semFavoritas = !!usuario && !carregandoFavoritos && favoritos.length === 0;
  const favoritas = subprefeituras.filter((s) => isFavorito(s.id));
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { search } = useLocation();
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { instalacao } = useInstalacao();
  useEffect(() => {
    // Espera os dados: decidir com favoritos/push carregando mandaria todo mundo ao onboarding.
    if (!usuario || carregandoFavoritos || push.estado === 'carregando' || jaViuAtivacao()) return;
    if (precisaDeAtivacao({ favoritas: favoritos.length, push: push.estado, instalacao })) {
      navigate(`/app/boas-vindas${search}`, { replace: true });
    }
  }, [usuario, carregandoFavoritos, push.estado, favoritos.length, instalacao, navigate, search]);
  const { detectar, carregando: localizando } = useGeolocalizacao();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  // Deep link /app?regiao=<slug> (SEO, sino, busca): reage a CADA troca do parâmetro,
  // não só ao primeiro carregamento. Subprefeitura abre o detalhe; zona só enquadra o mapa.
  // Slug inválido não repassa nada adiante: degradação limpa, sem foco.
  const slugParam = searchParams.get('regiao');
  const [slugAplicado, setSlugAplicado] = useState<string | null>(null);
  const [zonaEmFoco, setZonaEmFoco] = useState<string | null>(null);
  const [subSelecionada, setSubSelecionada] = useState<SubprefeituraMapaDto | null>(null);
  // Ajuste de estado durante o render (padrão do React p/ derivar de dados que chegam depois).
  if (slugParam !== slugAplicado && (subprefeituras.length > 0 || !slugParam)) {
    setSlugAplicado(slugParam);
    const alvo = slugParam ? resolverDeepLink(slugParam) : undefined;
    const sub = alvo?.nomeSub ? subprefeituras.find((s) => s.nome === alvo.nomeSub) ?? null : null;
    setZonaEmFoco(alvo && !alvo.nomeSub ? alvo.nomeRegiao : null);
    if (sub) setSubSelecionada(sub);
  }
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  // Tablet: o cartão do pé recolhe até só a busca, para devolver o mapa.
  const [painelRecolhido, setPainelRecolhido] = useState(false);
  const painelRef = useRef<HTMLElement>(null);
  useAlturaFluida(painelRef);
  const [camadaAtiva, setCamadaAtiva] = useState<Camada>('score');
  const [pontoBusca, setPontoBusca] = useState<PontoBusca | null>(null);
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null);
  const [overlayAlagamento, setOverlayAlagamento] = useState(false);
  const [proximas, setProximas] = useState<OcorrenciasProximasDto | null>(null);
  const { ocorrencias } = useOcorrenciasAlagamento(overlayAlagamento);




  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => console.warn('GeoJSON não encontrado'));
  }, []);

  // Trava o scroll do body enquanto o mapa está montado (evita pull-to-refresh /
  // bounce no mobile). Páginas com scroll (histórico, auth) não usam esta classe.
  useEffect(() => {
    document.body.classList.add('mapa-lock');
    return () => document.body.classList.remove('mapa-lock');
  }, []);

  // O deep link já foi aplicado; tirá-lo da URL faz o próximo toque no mesmo link
  // (sino, busca) contar como novo, em vez de cair numa URL que não mudou.
  function limparDeepLink() {
    if (!searchParams.has('regiao')) return;
    const p = new URLSearchParams(searchParams);
    p.delete('regiao');
    setSearchParams(p, { replace: true });
  }

  function fecharDetalhe() {
    limparDeepLink();
    setZonaEmFoco(null);
    setSubSelecionada(null);
    setPontoBusca(null);
    setAvisoBusca(null);
    setProximas(null);
  }

  // Núcleo compartilhado por busca e geolocalização: resolve o ponto para uma
  // seleção de região (ou aviso) e aplica no estado do mapa. Devolve se caiu na área.
  function selecionarPorPonto(ponto: PontoBusca, origem: 'busca' | 'localizacao') {
    setPontoBusca(ponto);
    const sel = resolverSelecao(ponto.lat, ponto.lon, geojson as FeatureCollection | null, subprefeituras, origem);
    if (sel.aviso) {
      setSubSelecionada(null);
      setAvisoBusca(sel.aviso);
      return false;
    }
    setAvisoBusca(null);
    setSubSelecionada(sel.sub);
    setPainelRecolhido(false);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
    return true;
  }

  // Pin arrastado: o ponto passa a ser exato (sem círculo nem aviso) e o mapa não voa.
  function handleMoverPonto(lat: number, lon: number) {
    selecionarPorPonto({ lat, lon, ajustado: true }, 'busca');
    void atualizarProximas(lat, lon);
  }

  // Seleção de um endereço na busca: marca o ponto no mapa, voa até ele e resolve
  // a subprefeitura/região correspondente (point-in-polygon sobre o GeoJSON já
  // carregado), abrindo o painel de detalhe. Fora dos polígonos → aviso.
  function handleSelecionarEndereco(endereco: EnderecoBusca) {
    selecionarPorPonto({ lat: endereco.latitude, lon: endereco.longitude }, 'busca');
  }

  async function atualizarProximas(lat: number, lon: number) {
    if (!overlayAlagamento) return;
    try {
      setProximas(await buscarOcorrenciasProximas(lat, lon));
    } catch {
      // silencioso: o card de proximidade é complementar; a região já foi resolvida
    }
  }

  // Botão "usar minha localização": detecta o ponto e reusa selecionarPorPonto.
  // Leitura pior que o raio do "perto de mim" pede ajuste manual do pin.
  async function handleUsarLocalizacao() {
    try {
      const { lat, lon, precisao } = await detectar();
      const dentro = selecionarPorPonto({ lat, lon, precisao }, 'localizacao');
      if (dentro && precisao > RAIO_PROXIMAS_M) {
        setAvisoBusca(`Localização aproximada (±${Math.round(precisao)} m). Arraste o pin para ajustar.`);
      }
      await atualizarProximas(lat, lon);
    } catch (err) {
      const tipo = err instanceof GeoError ? err.tipo : 'indisponivel';
      showToast(
        tipo === 'negado'
          ? 'Permita o acesso à localização no navegador para ver sua subprefeitura.'
          : 'Não consegui te localizar agora. Tente de novo ou busque pelo endereço.',
        'error',
      );
    }
  }

  // Toque numa subprefeitura (mapa, painel, busca): abre o detalhe dela e marca o
  // polígono (highlight + centralização).
  function handleSelecionarSub(sub: SubprefeituraMapaDto) {
    limparDeepLink();
    setSubSelecionada(sub);
    setPainelRecolhido(false);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
  }

  const buscaMapa = (embutida: boolean) => (
    <BuscaUnificada
      areas={subprefeituras}
      onSelecionarArea={handleSelecionarSub}
      onSelecionar={handleSelecionarEndereco}
      isMobile={isMobile}
      onUsarLocalizacao={handleUsarLocalizacao}
      localizando={localizando}
      embutida={embutida}
    />
  );

  return (
    <div className="relative h-[calc(100dvh-var(--seguro-topo))] overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Header de navegação (ETAPA B.1): top bar + tab bar mobile no rodapé */}
      <Header />

      {/* ══════════════════════════════════════════
          MAPA — camada de fundo absoluta
          Abaixo do header (48px mobile / 64px desktop); no mobile termina
          acima da tab bar inferior (48px).
      ══════════════════════════════════════════ */}
      <div data-transicao className={`mapa-app absolute left-0 right-0 bottom-[calc(3rem+var(--seguro-baixo))] md:bottom-0 top-0 z-0 `}>
        <MapaBase
          geojson={geojson}
          subprefeituras={subprefeituras}
          subSelecionada={subSelecionada}
          onSelecionarSub={handleSelecionarSub}
          camadaAtiva={camadaAtiva}
          zonaEmFoco={zonaEmFoco}
          subSelecionadaAtiva={!!subSelecionada}
          pontoBusca={pontoBusca}
          onMoverPonto={handleMoverPonto}
          overlayAlagamento={overlayAlagamento}
          ocorrencias={ocorrencias}
        />

        {/* Celular: busca sobreposta ao mapa. Tablet e computador: ela mora no painel. */}
        {isMobile && buscaMapa(false)}

        {/* Sidebar de camadas (ETAPA 3): vertical no desktop, horizontal no mobile */}
        <LayerControl
          camadaAtiva={camadaAtiva}
          onChange={setCamadaAtiva}
          isMobile={isMobile}
        />


        {/* Overlay de alagamentos (12 meses) — liga/desliga independente das camadas */}
        <OverlayAlagamentoToggle
          ativo={overlayAlagamento}
          onToggle={() => setOverlayAlagamento((v) => !v)}
          isMobile={isMobile}
        />

        {/* Pilha da legenda e dos avisos (tablet: à direita, no alto; computador: à esquerda, no pé).
            No celular a pilha some (display: contents) e cada peça se posiciona sozinha. */}
        <div className="pilha-mapa">
          {/* Legenda dinâmica: muda com a camada. Com o overlay ligado ganha a chave dos alagamentos. */}
          <MapLegend camadaAtiva={camadaAtiva} isMobile={isMobile} overlayAlagamento={overlayAlagamento} />

          {/* Aviso quando o endereço cai fora da área coberta */}
          {avisoBusca && (
            <div className="mapa-controle mapa-txt cartao-pe-mapa px-4 py-2.5 text-xs">
              {avisoBusca}
            </div>
          )}

          {/* Convite para ativar notificações push. Sem favorita o push não tem o que mandar:
              primeiro escolher, depois ativar. */}
          {semFavoritas
            ? <BannerEscolherSubprefeituras onEscolher={() => setPainelMobileAberto(true)} />
            : <ConvitePush />}

          {/* Card "perto de mim": contagem de alagamentos + risco elevado (Fase B) */}
          {proximas && (
            <CardAlagamentoProximo dados={proximas} onFechar={() => setProximas(null)} />
          )}
        </div>
      </div>

      {/* Banner de erro sobre o mapa */}
      {erro && !subSelecionada && (
        <div className="absolute top-[calc(var(--topo-app)+0.5rem)] left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PAINEL FLUTUANTE — tablet e computador
          Cartão de vidro do tamanho do conteúdo, com a busca dentro (pesquisou, a resposta
          aparece embaixo). Tablet: no pé do mapa, recolhível. Computador: à direita.
          A altura anima ao trocar lista, detalhe e resultados (useAlturaFluida).
      ══════════════════════════════════════════ */}
      <aside
        ref={painelRef}
        data-painel-mapa
        className={[
          'painel-flutuante painel-mapa vidro-painel vidro-surge hidden md:flex flex-col',
          subSelecionada && !painelRecolhido ? 'com-detalhe' : '',
        ].join(' ')}
      >
        {/* Alça do tablet: recolhe o cartão até só a busca. */}
        <button
          type="button"
          className="lg:hidden flex-shrink-0 h-5 w-full flex items-end justify-center"
          onClick={() => setPainelRecolhido((v) => !v)}
          aria-expanded={!painelRecolhido}
          aria-label={painelRecolhido ? 'Mostrar o painel' : 'Recolher o painel'}
        >
          <span className="w-9 h-[5px] rounded-full" style={{ background: 'color-mix(in srgb, var(--text-primary) 22%, transparent)' }} />
        </button>

        {!isMobile && buscaMapa(true)}

        <div key={subSelecionada?.id ?? 'lista'} className={['painel-conteudo flex-1 min-h-0 flex flex-col', painelRecolhido ? 'lg:flex hidden' : ''].join(' ')}>
          {subSelecionada ? (
            <DetalheSubprefeitura
              key={subSelecionada.id}
              area={subSelecionada}
              onFechar={fecharDetalhe}
              isFavorito={isFavorito}
              onToggleFavorito={toggleFavorito}
            />
          ) : (
            <PainelLateral
              areas={subprefeituras}
              favoritas={favoritas}
              carregando={carregando}
              erro={erro}
              ultimaAtualizacao={ultimaAtualizacao}
              onRecarregar={recarregar}
              onSelecionar={handleSelecionarSub}
            />
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM DRAWER
          Sheet que sobe do rodapé com handle
          Altura: 72vh. Fechado: 3.5rem visíveis.
      ══════════════════════════════════════════ */}
      <div
        className="painel-mapa vidro-painel md:hidden fixed bottom-[calc(3rem+var(--seguro-baixo))] left-0 right-0 z-[500] h-[72vh] flex flex-col rounded-t-[22px] overflow-hidden"
        style={{
          transform: painelMobileAberto
            ? 'translateY(0)'
            : 'translateY(calc(100% - 3.5rem))',
          transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle bar. O "Sair" que vivia aqui dentro saiu: era um botão dentro
            de outro (HTML inválido) e a quarta cópia da mesma ação na tela. O
            logout mora no header, presente em todas as páginas, e em
            Configurações. */}
        <div
          className="flex-shrink-0 h-14 flex items-stretch pr-3 rounded-t-[22px] relative select-none"
          style={{ background: 'var(--bg-primary)' }}
        >
          {/* Pílula de arraste */}
          <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full pointer-events-none" style={{ background: 'var(--border-glass)' }} />

          <button
            type="button"
            className="flex-1 min-w-0 flex items-center gap-2 pl-5 text-left transition-colors"
            onClick={() => setPainelMobileAberto((v) => !v)}
            aria-expanded={painelMobileAberto}
            aria-label={painelMobileAberto ? 'Recolher painel' : 'Expandir painel'}
          >
            <span className="flex-1 text-sm font-semibold mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
              {/* Fechada, a alça é a única linha visível: mostra o resumo. Aberta, o cartão da cidade já resume. */}
              {painelMobileAberto ? 'Monitoramento' : resumoAlertas(subprefeituras, carregando)}
            </span>
            {painelMobileAberto
              ? <ChevronDown size={18} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
              : <ChevronUp size={18} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            }
          </button>

        </div>

        {/* Painel (sem header duplicado) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <PainelLateral
            areas={subprefeituras}
            favoritas={favoritas}
            carregando={carregando}
            erro={erro}
            ultimaAtualizacao={ultimaAtualizacao}
            onRecarregar={recarregar}
            onSelecionar={(a) => {
              handleSelecionarSub(a);
              setPainelMobileAberto(false);
            }}
            hideHeader
          />
        </div>
      </div>

      {/* FAB: botão flutuante para abrir o drawer (visível quando fechado) */}
      {!painelMobileAberto && !subSelecionada && (
        <button
          className="md:hidden fixed z-[600] right-4 bottom-[calc(7rem+var(--seguro-baixo))] w-12 h-12 bg-pulsar-600 hover:bg-pulsar-700 active:scale-95 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-150"
          onClick={() => setPainelMobileAberto(true)}
          aria-label="Ver subprefeituras"
        >
          <Layers size={20} className="text-white" />
        </button>
      )}

      {/* ══════════════════════════════════════════
          MOBILE DETALHE — overlay fullscreen
          Aparece ao selecionar uma subprefeitura no mobile
      ══════════════════════════════════════════ */}
      {subSelecionada && isMobile && (
        <div className="fixed inset-x-0 bottom-0 top-[var(--seguro-topo)] z-[1100] flex flex-col animate-slide-up" style={{ background: 'var(--bg-primary)' }}>
          <DetalheSubprefeitura
            key={subSelecionada.id}
            area={subSelecionada}
            onFechar={fecharDetalhe}
            isFavorito={isFavorito}
            onToggleFavorito={toggleFavorito}
          />
        </div>
      )}
    </div>
  );
}
