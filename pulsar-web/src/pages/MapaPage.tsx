import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { GeoJsonObject, FeatureCollection } from 'geojson';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Map as MapIcon, Layers } from 'lucide-react';
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
import { buscarOcorrenciasProximas } from '../api/ocorrencias';
import type { SubprefeituraMapaDto, EnderecoBusca, OcorrenciasProximasDto } from '../types';

export default function MapaPage() {
  const { usuario } = useAuth();
  const { subprefeituras, carregando, erro, recarregar, ultimaAtualizacao } = useSubprefeituras();
  const { favoritos, isFavorito, toggleFavorito, carregando: carregandoFavoritos } = useFavoritos(usuario?.id ?? null);
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
  const [searchParams] = useSearchParams();

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
  const [sidebarColapsada, setSidebarColapsada] = useState(false);
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

  function fecharDetalhe() {
    setZonaEmFoco(null);
    setSubSelecionada(null);
    setPontoBusca(null);
    setAvisoBusca(null);
    setProximas(null);
  }

  // Núcleo compartilhado por busca e geolocalização: resolve o ponto para uma
  // seleção de região (ou aviso) e aplica no estado do mapa.
  function selecionarPorPonto(lat: number, lon: number, origem: 'busca' | 'localizacao') {
    setPontoBusca({ lat, lon });
    const sel = resolverSelecao(lat, lon, geojson as FeatureCollection | null, subprefeituras, origem);
    if (sel.aviso) {
      setSubSelecionada(null);
      setAvisoBusca(sel.aviso);
      return;
    }
    setAvisoBusca(null);
    setSubSelecionada(sel.sub);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
  }

  // Seleção de um endereço na busca: marca o ponto no mapa, voa até ele e resolve
  // a subprefeitura/região correspondente (point-in-polygon sobre o GeoJSON já
  // carregado), abrindo o painel de detalhe. Fora dos polígonos → aviso.
  function handleSelecionarEndereco(endereco: EnderecoBusca) {
    selecionarPorPonto(endereco.latitude, endereco.longitude, 'busca');
  }

  // Botão "usar minha localização": detecta o ponto e reusa selecionarPorPonto.
  async function handleUsarLocalizacao() {
    try {
      const { lat, lon } = await detectar();
      selecionarPorPonto(lat, lon, 'localizacao');
      if (overlayAlagamento) {
        try {
          setProximas(await buscarOcorrenciasProximas(lat, lon));
        } catch {
          // silencioso: o card de proximidade é complementar; a região já foi resolvida
        }
      }
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
    setSubSelecionada(sub);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
  }

  // Classes do mapa: offset lateral conforme sidebar (tablet esquerda / desktop direita)
  const mapaOffsetClass = sidebarColapsada
    ? 'md:left-14 lg:left-0 lg:right-14'
    : 'md:left-80 lg:left-0 lg:right-[350px]';

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Convite para ativar notificações push (o onboarding agora é a rota /app/boas-vindas). */}
      {/* Sem favorita o push não tem o que mandar: primeiro escolher, depois ativar. */}
      {semFavoritas
        ? <BannerEscolherSubprefeituras onEscolher={() => setPainelMobileAberto(true)} />
        : <ConvitePush />}

      {/* Header de navegação (ETAPA B.1): top bar + tab bar mobile no rodapé */}
      <Header />

      {/* ══════════════════════════════════════════
          MAPA — camada de fundo absoluta
          Abaixo do header (48px mobile / 64px desktop); no mobile termina
          acima da tab bar inferior (48px).
      ══════════════════════════════════════════ */}
      <div className={`absolute left-0 right-0 bottom-12 md:bottom-0 top-12 md:top-16 z-0 transition-all duration-300 ease-out ${mapaOffsetClass}`}>
        <MapaBase
          geojson={geojson}
          subprefeituras={subprefeituras}
          subSelecionada={subSelecionada}
          onSelecionarSub={handleSelecionarSub}
          camadaAtiva={camadaAtiva}
          zonaEmFoco={zonaEmFoco}
          subSelecionadaAtiva={!!subSelecionada}
          pontoBusca={pontoBusca}
          overlayAlagamento={overlayAlagamento}
          ocorrencias={ocorrencias}
        />

        {/* Busca unificada (subprefeitura + endereço) sobreposta ao mapa */}
        <BuscaUnificada
          areas={subprefeituras}
          onSelecionarArea={handleSelecionarSub}
          onSelecionar={handleSelecionarEndereco}
          isMobile={isMobile}
          onUsarLocalizacao={handleUsarLocalizacao}
          localizando={localizando}
        />

        {/* Aviso quando o endereço cai fora da área coberta */}
        {avisoBusca && (
          <div className="mapa-controle mapa-txt absolute left-1/2 -translate-x-1/2 z-[1200] bottom-[7.5rem] md:bottom-6 max-w-[calc(100%-1.5rem)] px-4 py-2.5 text-xs shadow-xl">
            {avisoBusca}
          </div>
        )}

        {/* Sidebar de camadas (ETAPA 3): vertical no desktop, horizontal no mobile */}
        <LayerControl
          camadaAtiva={camadaAtiva}
          onChange={setCamadaAtiva}
          isMobile={isMobile}
        />

        {/* Legenda dinâmica (ETAPA 6.1/6.2): muda conforme a camada ativa. Com o
            overlay ligado ganha a chave dos alagamentos, em vez de sumir: os
            polígonos continuam coloridos pela camada, então as duas leituras
            precisam de legenda ao mesmo tempo. */}
        <MapLegend camadaAtiva={camadaAtiva} isMobile={isMobile} overlayAlagamento={overlayAlagamento} />


        {/* Overlay de alagamentos (12 meses) — liga/desliga independente das camadas */}
        <OverlayAlagamentoToggle
          ativo={overlayAlagamento}
          onToggle={() => setOverlayAlagamento((v) => !v)}
          isMobile={isMobile}
        />

        {/* Card "perto de mim": contagem de alagamentos + risco elevado (Fase B) */}
        {proximas && (
          <CardAlagamentoProximo dados={proximas} onFechar={() => setProximas(null)} />
        )}
      </div>

      {/* Banner de erro sobre o mapa */}
      {erro && !subSelecionada && (
        <div className="absolute top-14 md:top-20 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SIDEBAR — Tablet (md) + Desktop (lg)
          Tablet: sidebar esquerda, colapsável
          Desktop: sidebar direita, 350px fixa
      ══════════════════════════════════════════ */}
      <aside
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-glass)' }}
        className={[
          "hidden md:flex flex-col absolute top-16 bottom-0 z-[200]",
          "shadow-xl overflow-hidden",
          "transition-[width] duration-300 ease-out",
          // Tablet: lado esquerdo
          "md:left-0 md:border-r",
          // Desktop: lado direito (sobrescreve md:)
          "lg:left-auto lg:right-0 lg:border-r-0 lg:border-l",
          // Largura: colapsada (w-14 = 56px) ou expandida
          sidebarColapsada ? "w-14" : "md:w-80 lg:w-[350px]",
        ].join(" ")}
      >
        {/* Toggle de colapso — somente tablet (md, oculto em lg) */}
        <button
          className={[
            "lg:hidden absolute top-1/2 -translate-y-1/2 z-10",
            sidebarColapsada ? "right-0" : "-right-3",
            "w-6 h-10 bg-pulsar-900 border border-pulsar-800 shadow",
            "flex items-center justify-center rounded-r-lg",
            "hover:bg-pulsar-800 active:bg-pulsar-700 transition-colors",
          ].join(" ")}
          onClick={() => setSidebarColapsada((v) => !v)}
          title={sidebarColapsada ? "Expandir painel" : "Recolher painel"}
        >
          {sidebarColapsada
            ? <ChevronRight size={12} className="text-pulsar-300" />
            : <ChevronLeft size={12} className="text-pulsar-300" />
          }
        </button>

        {sidebarColapsada ? (
          /* Ícone reduzido quando colapsada */
          <div className="flex flex-col items-center pt-6 gap-4">
            <div className="w-8 h-8 rounded-lg bg-pulsar-600 flex items-center justify-center">
              <MapIcon size={15} className="text-white" />
            </div>
          </div>
        ) : (
          /* Conteúdo completo */
          subSelecionada ? (
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
          )
        )}
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM DRAWER
          Sheet que sobe do rodapé com handle
          Altura: 72vh. Fechado: 3.5rem visíveis.
      ══════════════════════════════════════════ */}
      <div
        className="md:hidden fixed bottom-12 left-0 right-0 z-[500] h-[72vh] flex flex-col rounded-t-[22px] overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          boxShadow: '0 -8px 40px rgba(5, 47, 74, 0.20)',
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
          className="md:hidden fixed z-[600] right-4 bottom-[7rem] w-12 h-12 bg-pulsar-600 hover:bg-pulsar-700 active:scale-95 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-150"
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
        <div className="fixed inset-0 z-[1100] flex flex-col animate-slide-up" style={{ background: 'var(--bg-primary)' }}>
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
