import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GeoJsonObject, FeatureCollection } from 'geojson';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Map as MapIcon, Layers, LogOut } from 'lucide-react';
import MapaBase, { type PontoBusca } from '../components/mapa/MapaBase';
import BuscaEndereco from '../components/mapa/BuscaEndereco';
import LayerControl from '../components/mapa/LayerControl';
import MapLegend from '../components/mapa/MapLegend';
import PainelLateral from '../components/painel/PainelLateral';
import DetalheRegiao from '../components/painel/DetalheRegiao';
import ErrorBanner from '../components/ui/ErrorBanner';
import Header from '../components/ui/Header';
import type { Camada } from '../utils/camadas';
import { useAuth } from '../contexts/AuthContext';
import { useRegioes } from '../hooks/useRegioes';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useFavoritos } from '../hooks/useFavoritos';
import { useIsMobile } from '../hooks/useIsMobile';
import { useOnboarding } from '../hooks/useOnboarding';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import ConvitePush from '../components/notificacoes/ConvitePush';
import { useGeolocalizacao, GeoError } from '../hooks/useGeolocalizacao';
import { resolverSelecao } from '../utils/selecaoPorPonto';
import { useToast } from '../contexts/ToastContext';
import { getZonaPorSlug } from '../data/regioes-seo';
import OverlayAlagamentoToggle from '../components/mapa/OverlayAlagamentoToggle';
import CardAlagamentoProximo from '../components/mapa/CardAlagamentoProximo';
import { useOcorrenciasAlagamento } from '../hooks/useOcorrenciasAlagamento';
import { buscarOcorrenciasProximas } from '../api/ocorrencias';
import type { SubprefeituraMapaDto, EnderecoBusca, OcorrenciasProximasDto } from '../types';

export default function MapaPage() {
  const { usuario, logout } = useAuth();
  const { regioes, carregando, erro, recarregar, ultimaAtualizacao } = useRegioes();
  const subprefeituras = useSubprefeituras(regioes);
  const { isFavorito, toggleFavorito } = useFavoritos(usuario?.id ?? null);
  const isMobile = useIsMobile(768);
  const { aberto: onboardingAberto, concluir: concluirOnboarding } = useOnboarding();
  const { detectar, carregando: localizando } = useGeolocalizacao();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  // Deep-link de conversão: ?regiao=<slug> (vindo das páginas públicas de SEO,
  // via useDestinoPosAuth) foca a zona correspondente já no estado inicial.
  // Slug inválido não repassa nada adiante — degradação limpa, sem foco.
  const [regiaoSelecionadaNome, setRegiaoSelecionadaNome] = useState<string | null>(() => {
    const slug = searchParams.get('regiao');
    const zona = slug ? getZonaPorSlug(slug) : undefined;
    return zona ? zona.nomeRegiao : null;
  });
  const [subSelecionada, setSubSelecionada] = useState<SubprefeituraMapaDto | null>(null);
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  const [sidebarColapsada, setSidebarColapsada] = useState(false);
  const [camadaAtiva, setCamadaAtiva] = useState<Camada>('score');
  const [pontoBusca, setPontoBusca] = useState<PontoBusca | null>(null);
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null);
  const [overlayAlagamento, setOverlayAlagamento] = useState(false);
  const [proximas, setProximas] = useState<OcorrenciasProximasDto | null>(null);
  const { ocorrencias } = useOcorrenciasAlagamento(overlayAlagamento);

  const regiaoSelecionada = regioes.find(
    (r) => r.nome.toLowerCase() === regiaoSelecionadaNome?.toLowerCase()
  ) ?? null;

  const alertasAtivos = regioes.filter((r) => r.faixaRisco === 'ALTO').length;

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
    setRegiaoSelecionadaNome(null);
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
      setRegiaoSelecionadaNome(null);
      setSubSelecionada(null);
      setAvisoBusca(sel.aviso);
      return;
    }
    setAvisoBusca(null);
    setSubSelecionada(sel.sub);
    setRegiaoSelecionadaNome(sel.regiaoNome);
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
          ? 'Permita o acesso à localização no navegador para ver sua região.'
          : 'Não consegui te localizar agora. Tente de novo ou busque pelo endereço.',
        'error',
      );
    }
  }

  // Clique em um label/polígono de subprefeitura: abre o detalhe da região e
  // marca a subprefeitura selecionada (highlight do polígono + centralização).
  function handleSelecionarSub(sub: SubprefeituraMapaDto) {
    setSubSelecionada(sub);
    setRegiaoSelecionadaNome(sub.regiaoNome);
    if (isMobile) setPainelMobileAberto(false);
  }

  // Seleção via lista lateral (por nome de região) — sem subprefeitura específica.
  function selecionarRegiaoPorNome(nome: string) {
    setRegiaoSelecionadaNome(nome);
    setSubSelecionada(null);
  }

  const painelProps = {
    regioes,
    carregando,
    erro,
    regiaoSelecionada: regiaoSelecionadaNome,
    onRecarregar: recarregar,
    ultimaAtualizacao,
    onLogout: logout,
    nomeUsuario: usuario?.nome ?? '',
    isFavorito,
    onToggleFavorito: toggleFavorito,
  };

  // Classes do mapa: offset lateral conforme sidebar (tablet esquerda / desktop direita)
  const mapaOffsetClass = sidebarColapsada
    ? 'md:left-14 lg:left-0 lg:right-14'
    : 'md:left-80 lg:left-0 lg:right-[350px]';

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Onboarding de boas-vindas — só na 1ª visita */}
      {onboardingAberto && <OnboardingModal onConcluir={concluirOnboarding} />}

      {/* Convite para ativar notificações push — só após o onboarding fechar */}
      {!onboardingAberto && <ConvitePush />}

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
          regiaoSelecionadaNome={regiaoSelecionadaNome}
          subSelecionadaAtiva={!!subSelecionada}
          pontoBusca={pontoBusca}
          overlayAlagamento={overlayAlagamento}
          ocorrencias={ocorrencias}
        />

        {/* Busca de rua/endereço sobreposta ao mapa */}
        <BuscaEndereco
          onSelecionar={handleSelecionarEndereco}
          isMobile={isMobile}
          onUsarLocalizacao={handleUsarLocalizacao}
          localizando={localizando}
        />

        {/* Aviso quando o endereço cai fora da área coberta */}
        {avisoBusca && (
          <div className="absolute left-1/2 -translate-x-1/2 z-[1200] bottom-[7.5rem] md:bottom-6 max-w-[calc(100%-1.5rem)] px-4 py-2.5 rounded-xl bg-pulsar-900/90 border border-pulsar-700 text-xs text-pulsar-100 shadow-xl backdrop-blur-md">
            {avisoBusca}
          </div>
        )}

        {/* Sidebar de camadas (ETAPA 3): vertical no desktop, horizontal no mobile */}
        <LayerControl
          camadaAtiva={camadaAtiva}
          onChange={setCamadaAtiva}
          isMobile={isMobile}
        />

        {/* Legenda dinâmica (ETAPA 6.1/6.2): muda conforme a camada ativa.
            Oculta no modo foco de alagamentos (a legenda é da escala de score). */}
        {!overlayAlagamento && <MapLegend camadaAtiva={camadaAtiva} isMobile={isMobile} />}

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
      {erro && !regiaoSelecionada && (
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
          regiaoSelecionada ? (
            <DetalheRegiao
              key={regiaoSelecionada.id}
              regiaoId={regiaoSelecionada.id}
              onFechar={fecharDetalhe}
              isFavorito={isFavorito(regiaoSelecionada.id)}
              onToggleFavorito={() => toggleFavorito(regiaoSelecionada.id)}
            />
          ) : (
            <PainelLateral
              {...painelProps}
              onSelecionarRegiao={selecionarRegiaoPorNome}
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
        {/* Handle bar */}
        <button
          className="flex-shrink-0 h-14 flex items-center px-5 rounded-t-[22px] relative select-none transition-colors"
          style={{ background: 'var(--bg-primary)' }}
          onClick={() => setPainelMobileAberto((v) => !v)}
        >
          {/* Pílula de arraste */}
          <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full" style={{ background: 'var(--border-glass)' }} />

          <span className="flex-1 text-sm font-semibold mt-1 text-left truncate" style={{ color: 'var(--text-primary)' }}>
            {alertasAtivos > 0
              ? `${alertasAtivos} ${alertasAtivos === 1 ? 'alerta ativo' : 'alertas ativos'}`
              : 'Tudo tranquilo em São Paulo'}
          </span>

          {/* Botão Sair dentro do handle */}
          <button
            onClick={(e) => { e.stopPropagation(); logout(); }}
            className="mr-3 mt-1 flex items-center gap-1 text-[11px] transition-colors flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Sair da conta"
          >
            <LogOut size={11} />
            <span>Sair</span>
          </button>

          {painelMobileAberto
            ? <ChevronDown size={18} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            : <ChevronUp size={18} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          }
        </button>

        {/* Lista de regiões (sem header duplicado) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <PainelLateral
            {...painelProps}
            onSelecionarRegiao={(nome) => {
              selecionarRegiaoPorNome(nome);
              setPainelMobileAberto(false);
            }}
            hideHeader
          />
        </div>
      </div>

      {/* FAB: botão flutuante para abrir o drawer (visível quando fechado) */}
      {!painelMobileAberto && !regiaoSelecionada && (
        <button
          className="md:hidden fixed z-[600] right-4 bottom-[7rem] w-12 h-12 bg-pulsar-600 hover:bg-pulsar-700 active:scale-95 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-150"
          onClick={() => setPainelMobileAberto(true)}
          aria-label="Ver regiões"
        >
          <Layers size={20} className="text-white" />
        </button>
      )}

      {/* ══════════════════════════════════════════
          MOBILE DETALHE — overlay fullscreen
          Aparece ao selecionar uma região no mobile
      ══════════════════════════════════════════ */}
      {regiaoSelecionada && isMobile && (
        <div className="fixed inset-0 z-[1100] flex flex-col animate-slide-up" style={{ background: 'var(--bg-primary)' }}>
          <DetalheRegiao
            key={regiaoSelecionada.id}
            regiaoId={regiaoSelecionada.id}
            onFechar={fecharDetalhe}
            isFavorito={isFavorito(regiaoSelecionada.id)}
            onToggleFavorito={() => toggleFavorito(regiaoSelecionada.id)}
          />
        </div>
      )}
    </div>
  );
}
