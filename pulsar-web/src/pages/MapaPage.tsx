import { useState, useEffect } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapaBase from '../components/mapa/MapaBase';
import PainelLateral from '../components/painel/PainelLateral';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { useRegioes } from '../hooks/useRegioes';

export default function MapaPage() {
  const { usuario, logout } = useAuth();
  const { regioes, carregando, erro, recarregar, ultimaAtualizacao } = useRegioes();
  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string | null>(null);

  // Carregar GeoJSON das subprefeituras
  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => console.warn('GeoJSON não encontrado'));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <PainelLateral
        regioes={regioes}
        carregando={carregando}
        erro={erro}
        regiaoSelecionada={regiaoSelecionada}
        onSelecionarRegiao={setRegiaoSelecionada}
        onRecarregar={recarregar}
        ultimaAtualizacao={ultimaAtualizacao}
        onLogout={logout}
        nomeUsuario={usuario?.nome ?? ''}
      />

      <main className="flex-1 flex flex-col min-h-0 relative">
        {erro && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        )}
        <MapaBase
          geojson={geojson}
          regioes={regioes}
          regiaoSelecionada={regiaoSelecionada}
          onSelecionarRegiao={setRegiaoSelecionada}
        />
      </main>
    </div>
  );
}
