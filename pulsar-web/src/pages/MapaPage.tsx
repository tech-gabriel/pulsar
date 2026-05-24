import { useState, useEffect } from 'react';
import type { GeoJsonObject } from 'geojson';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Map as MapIcon, Layers, LogOut } from 'lucide-react';
import MapaBase from '../components/mapa/MapaBase';
import PainelLateral from '../components/painel/PainelLateral';
import DetalheRegiao from '../components/painel/DetalheRegiao';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { useRegioes } from '../hooks/useRegioes';
import { useFavoritos } from '../hooks/useFavoritos';
import { useIsMobile } from '../hooks/useIsMobile';

export default function MapaPage() {
  const { usuario, logout } = useAuth();
  const { regioes, carregando, erro, recarregar, ultimaAtualizacao } = useRegioes();
  const { isFavorito, toggleFavorito } = useFavoritos(usuario?.id ?? null);
  const isMobile = useIsMobile(768);

  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  const [regiaoSelecionadaNome, setRegiaoSelecionadaNome] = useState<string | null>(null);
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  const [sidebarColapsada, setSidebarColapsada] = useState(false);

  const regiaoSelecionada = regioes.find(
    (r) => r.nome.toLowerCase() === regiaoSelecionadaNome?.toLowerCase()
  ) ?? null;

  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => console.warn('GeoJSON não encontrado'));
  }, []);

  function fecharDetalhe() {
    setRegiaoSelecionadaNome(null);
  }

  function handleSelecionarRegiao(nome: string) {
    setRegiaoSelecionadaNome(nome);
    if (isMobile) setPainelMobileAberto(false);
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
  };

  // Classes do mapa: offset lateral conforme sidebar (tablet esquerda / desktop direita)
  const mapaOffsetClass = sidebarColapsada
    ? 'md:left-14 lg:left-0 lg:right-14'
    : 'md:left-80 lg:left-0 lg:right-[350px]';

  return (
    <div className="relative h-screen overflow-hidden bg-slate-900">

      {/* ══════════════════════════════════════════
          MAPA — camada de fundo absoluta
          Recua margem conforme sidebar visível
      ══════════════════════════════════════════ */}
      <div className={`absolute inset-0 z-0 transition-all duration-300 ease-out ${mapaOffsetClass}`}>
        <MapaBase
          geojson={geojson}
          regioes={regioes}
          regiaoSelecionada={regiaoSelecionadaNome}
          onSelecionarRegiao={handleSelecionarRegiao}
        />
      </div>

      {/* Banner de erro sobre o mapa */}
      {erro && !regiaoSelecionada && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
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
        className={[
          "hidden md:flex flex-col absolute top-0 bottom-0 z-[200]",
          "bg-white border-slate-200 shadow-xl overflow-hidden",
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
            "w-6 h-10 bg-white border border-slate-200 shadow",
            "flex items-center justify-center rounded-r-lg",
            "hover:bg-pulsar-50 active:bg-pulsar-100 transition-colors",
          ].join(" ")}
          onClick={() => setSidebarColapsada((v) => !v)}
          title={sidebarColapsada ? "Expandir painel" : "Recolher painel"}
        >
          {sidebarColapsada
            ? <ChevronRight size={12} className="text-slate-500" />
            : <ChevronLeft size={12} className="text-slate-500" />
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
              onSelecionarRegiao={setRegiaoSelecionadaNome}
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-[500] h-[72vh] flex flex-col rounded-t-[22px] bg-white overflow-hidden"
        style={{
          boxShadow: '0 -8px 40px rgba(5, 47, 74, 0.20)',
          transform: painelMobileAberto
            ? 'translateY(0)'
            : 'translateY(calc(100% - 3.5rem))',
          transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle bar */}
        <button
          className="flex-shrink-0 h-14 flex items-center px-5 bg-pulsar-950 rounded-t-[22px] relative select-none active:bg-pulsar-900 transition-colors"
          onClick={() => setPainelMobileAberto((v) => !v)}
        >
          {/* Pílula de arraste */}
          <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-9 h-[3px] bg-white/20 rounded-full" />

          <span className="flex-1 text-sm font-semibold text-white mt-1 text-left truncate">
            Regiões de São Paulo
          </span>

          {/* Botão Sair dentro do handle */}
          <button
            onClick={(e) => { e.stopPropagation(); logout(); }}
            className="mr-3 mt-1 flex items-center gap-1 text-[11px] text-pulsar-300 hover:text-white transition-colors flex-shrink-0"
            aria-label="Sair da conta"
          >
            <LogOut size={11} />
            <span>Sair</span>
          </button>

          {painelMobileAberto
            ? <ChevronDown size={18} className="text-pulsar-300 mt-1 flex-shrink-0" />
            : <ChevronUp size={18} className="text-pulsar-300 mt-1 flex-shrink-0" />
          }
        </button>

        {/* Lista de regiões (sem header duplicado) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <PainelLateral
            {...painelProps}
            onSelecionarRegiao={(nome) => {
              setRegiaoSelecionadaNome(nome);
              setPainelMobileAberto(false);
            }}
            hideHeader
          />
        </div>
      </div>

      {/* FAB: botão flutuante para abrir o drawer (visível quando fechado) */}
      {!painelMobileAberto && !regiaoSelecionada && (
        <button
          className="md:hidden fixed z-[600] right-4 bottom-[4.5rem] w-12 h-12 bg-pulsar-600 hover:bg-pulsar-700 active:scale-95 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-150"
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
        <div className="fixed inset-0 z-[700] flex flex-col bg-white animate-slide-up">
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
