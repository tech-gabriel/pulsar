import { useState, useEffect } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapaBase from '../components/mapa/MapaBase';
import PainelLateral from '../components/painel/PainelLateral';
import DetalheRegiao from '../components/painel/DetalheRegiao';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { useRegioes } from '../hooks/useRegioes';
import { useFavoritos } from '../hooks/useFavoritos';

export default function MapaPage() {
  const { usuario, logout } = useAuth();
  const { regioes, carregando, erro, recarregar, ultimaAtualizacao } = useRegioes();
  const { isFavorito, toggleFavorito } = useFavoritos(usuario?.id ?? null);

  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  const [regiaoSelecionadaNome, setRegiaoSelecionadaNome] = useState<string | null>(null);

  // Resolve nome → id
  const regiaoSelecionada = regioes.find(
    (r) => r.nome.toLowerCase() === regiaoSelecionadaNome?.toLowerCase()
  ) ?? null;

  // Carregar GeoJSON das subprefeituras
  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => console.warn('GeoJSON não encontrado'));
  }, []);

  function fecharDetalhe() {
    setRegiaoSelecionadaNome(null);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: lista ou detalhe */}
      <div className="w-80 flex flex-col bg-white border-r border-slate-200 shadow-sm overflow-hidden relative">
        {regiaoSelecionada ? (
          <DetalheRegiao
            key={regiaoSelecionada.id}
            regiaoId={regiaoSelecionada.id}
            onFechar={fecharDetalhe}
            isFavorito={isFavorito(regiaoSelecionada.id)}
            onToggleFavorito={() => toggleFavorito(regiaoSelecionada.id)}
          />
        ) : (
          <PainelLateral
            regioes={regioes}
            carregando={carregando}
            erro={erro}
            regiaoSelecionada={regiaoSelecionadaNome}
            onSelecionarRegiao={setRegiaoSelecionadaNome}
            onRecarregar={recarregar}
            ultimaAtualizacao={ultimaAtualizacao}
            onLogout={logout}
            nomeUsuario={usuario?.nome ?? ''}
          />
        )}
      </div>

      {/* Mapa */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {erro && !regiaoSelecionada && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        )}
        <MapaBase
          geojson={geojson}
          regioes={regioes}
          regiaoSelecionada={regiaoSelecionadaNome}
          onSelecionarRegiao={setRegiaoSelecionadaNome}
        />
      </main>
    </div>
  );
}
