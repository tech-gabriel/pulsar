import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History, ChevronRight, Thermometer, SearchX } from 'lucide-react';
import Header from '../components/ui/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { useRegioes } from '../hooks/useRegioes';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { coresParaFaixa, labelFaixa } from '../utils/risco';

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Lista de todas as subprefeituras com busca; clicar abre o histórico 24h. */
export default function HistoricoListPage() {
  const navigate = useNavigate();
  const { regioes, carregando, erro, recarregar } = useRegioes();
  const subprefeituras = useSubprefeituras(regioes);
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const filtro = normalizar(busca);
    return [...subprefeituras]
      .filter((s) => !filtro || normalizar(s.nome).includes(filtro) || normalizar(s.regiaoNome).includes(filtro))
      .sort((a, b) => (b.scoreAtual?.valor ?? 0) - (a.scoreAtual?.valor ?? 0));
  }, [subprefeituras, busca]);

  const vazio = !carregando && !erro && subprefeituras.length === 0;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-3 sm:px-4" style={{ maxWidth: 720, paddingTop: 72, paddingBottom: 72 }}>
        {/* Título */}
        <div className="flex items-center gap-2 mb-4">
          <History size={20} style={{ color: 'var(--text-accent)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
            Histórico por subprefeitura
          </h1>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar subprefeitura ou região…"
            className="input-glass"
            style={{ paddingLeft: 40 }}
          />
        </div>

        {carregando && <LoadingSpinner mensagem="Carregando subprefeituras..." className="h-60" />}

        {erro && !carregando && (
          <div className="mb-4">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        )}

        {vazio && (
          <EmptyState
            Icon={History}
            mensagem="Ainda não há subprefeituras para mostrar aqui. Volte mais tarde para acompanhar o histórico."
          />
        )}

        {!carregando && !erro && lista.length === 0 && subprefeituras.length > 0 && (
          <EmptyState Icon={SearchX} mensagem={`Nenhum resultado para “${busca}”.`} />
        )}

        {/* Lista */}
        <div className="flex flex-col gap-2">
          {lista.map((sub) => {
            const cores = coresParaFaixa(sub.faixaRisco);
            const score = sub.scoreAtual?.valor;
            const temp = sub.ultimaLeitura?.temperaturaC;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigate(`/app/historico/${sub.id}`, { state: { regiaoNome: sub.regiaoNome, subNome: sub.nome } })}
                className="glass-card glass-card-hover w-full text-left flex items-center gap-3 px-4 py-3 active:scale-[0.99] transition-transform"
              >
                {/* Score pill */}
                <span
                  className="inline-flex items-center justify-center rounded-full text-white flex-shrink-0"
                  style={{ background: cores.fill, width: 44, height: 44, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, boxShadow: `0 0 10px ${cores.fill}55` }}
                >
                  {score != null ? Math.round(score) : '—'}
                </span>

                {/* Nome + região */}
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                    {sub.nome}
                  </p>
                  <p className="truncate flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>{sub.regiaoNome}</span>
                    <span style={{ color: cores.fill }}>• {labelFaixa(sub.faixaRisco)}</span>
                    {temp != null && (
                      <span className="inline-flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                        <Thermometer size={12} /> {Math.round(temp)}°C
                      </span>
                    )}
                  </p>
                </div>

                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
