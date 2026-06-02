import { Newspaper, ExternalLink, Clock, RefreshCw } from 'lucide-react';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';
import ErrorBanner from '../components/ui/ErrorBanner';
import FonteBadge from '../components/ui/FonteBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { useNoticias } from '../hooks/useNoticias';
import { tempoRelativo, dataCompleta } from '../utils/data';

/** Feed de notícias climáticas de São Paulo (atualmente CGE-SP; extensível a outras fontes). */
export default function NoticiasPage() {
  const { noticias, carregando, erro, recarregar, ultimaAtualizacao } = useNoticias();

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-3 sm:px-4" style={{ maxWidth: 720, paddingTop: 72, paddingBottom: 72 }}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Newspaper size={20} style={{ color: 'var(--text-accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
              Notícias climáticas
            </h1>
          </div>
          <button
            type="button"
            onClick={recarregar}
            disabled={carregando}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Atualizar notícias"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
        <p className="mb-5" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Alertas e boletins climáticos de São Paulo
          {ultimaAtualizacao && (
            <span style={{ color: 'var(--text-muted)' }} title={dataCompleta(ultimaAtualizacao.toISOString())}>
              {' '}· atualizado {tempoRelativo(ultimaAtualizacao.toISOString())}
            </span>
          )}
        </p>

        {/* Erro */}
        {erro && !carregando && (
          <div className="mb-4">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        )}

        {/* Loading skeleton */}
        {carregando && noticias.length === 0 && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <GlassCard key={i} hover={false} padding="lg">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-5/6 mb-3" />
                <Skeleton className="h-3 w-28" />
              </GlassCard>
            ))}
          </div>
        )}

        {/* Estado vazio */}
        {!carregando && !erro && noticias.length === 0 && (
          <GlassCard hover={false} padding="lg" className="text-center !py-12">
            <Newspaper size={48} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Nenhuma notícia disponível no momento.
            </p>
          </GlassCard>
        )}

        {/* Lista de notícias */}
        <div className="flex flex-col gap-3">
          {noticias.map((noticia, i) => (
            <a
              key={`${noticia.link}-${i}`}
              href={noticia.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <GlassCard padding="lg" className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="flex-1"
                    style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.35 }}
                  >
                    {noticia.titulo}
                  </h2>
                  <ExternalLink size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                </div>

                {noticia.resumo && (
                  <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {noticia.resumo}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <FonteBadge fonte={noticia.fonte} fonteUrl={noticia.fonteUrl} size={15} />
                  <span>·</span>
                  <span className="inline-flex items-center gap-1" title={dataCompleta(noticia.publicadoEm)}>
                    <Clock size={13} />
                    {tempoRelativo(noticia.publicadoEm)}
                  </span>
                </div>
              </GlassCard>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
