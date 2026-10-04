import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History, ChevronRight, Thermometer, SearchX, Star } from 'lucide-react';
import Header from '../components/ui/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useFavoritos } from '../hooks/useFavoritos';
import { useAuth } from '../contexts/AuthContext';
import { normalizarNome } from '../utils/texto';
import { coresParaFaixa, labelFaixa } from '../utils/risco';
import { fundoParaTextoBranco } from '../utils/contraste';

/** Lista de todas as subprefeituras com busca; clicar abre o histórico 24h. */
export default function HistoricoListPage() {
  const navigate = useNavigate();
  const { subprefeituras, carregando, erro, recarregar } = useSubprefeituras();
  const [busca, setBusca] = useState('');

  const { usuario } = useAuth();
  const { favoritos } = useFavoritos(usuario?.id ?? null);
  const favIds = useMemo(() => new Set(favoritos.map((f) => f.subprefeituraId)), [favoritos]);

  // Lista única (SP3): as que a pessoa acompanha no topo, depois ordem alfabética.
  const lista = useMemo(() => {
    const filtro = normalizarNome(busca);
    return [...subprefeituras]
      .filter((s) => !filtro || normalizarNome(s.nome).includes(filtro) || normalizarNome(s.zona).includes(filtro))
      .sort((a, b) => Number(favIds.has(b.id)) - Number(favIds.has(a.id)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [subprefeituras, busca, favIds]);

  const vazio = !carregando && !erro && subprefeituras.length === 0;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-3 sm:px-4" style={{ maxWidth: 1180, paddingTop: 72, paddingBottom: 72 }}>
        {/* Título */}
        <div className="flex items-center gap-2 mb-4">
          <History size={20} style={{ color: 'var(--text-accent)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
            Histórico por subprefeitura
          </h1>
        </div>

        {/* Busca */}
        <div className="relative mb-4" style={{ maxWidth: 480 }}>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar subprefeitura ou zona…"
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
            animacao="radar"
            mensagem="Ainda não há subprefeituras para mostrar aqui. Volte mais tarde para acompanhar o histórico."
          />
        )}

        {!carregando && !erro && lista.length === 0 && subprefeituras.length > 0 && (
          <EmptyState Icon={SearchX} animacao="buscaVazia" mensagem={`Nenhum resultado para “${busca}”.`} />
        )}

        {/* Lista única. Em telas largas vira grade: uma coluna de 510px num monitor de
            1440 deixava dois terços da tela vazios. */}
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((sub) => {
            const cores = coresParaFaixa(sub.faixaRisco);
            const score = sub.scoreAtual?.valor;
            const temp = sub.ultimaLeitura?.temperaturaC;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigate(`/app/historico/${sub.id}`, { state: { zona: sub.zona, subNome: sub.nome } })}
                className="glass-card glass-card-hover w-full text-left flex items-center gap-3 px-4 py-3 active:scale-[0.99] transition-transform"
              >
                {/* Score pill */}
                <span
                  className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ background: fundoParaTextoBranco(cores.fill), color: '#FFFFFF', width: 44, height: 44, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, boxShadow: `0 0 10px ${cores.fill}55` }}
                >
                  {score != null ? Math.round(score) : '—'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                    {favIds.has(sub.id) && <Star size={13} fill="#FACC15" stroke="#EAB308" aria-label="Você acompanha" className="inline mr-1 -mt-0.5" />}
                    {sub.nome}
                  </p>
                  <p className="truncate flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{sub.zona}</span>
                    <span style={{ color: cores.fill }}>{labelFaixa(sub.faixaRisco)}</span>
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
