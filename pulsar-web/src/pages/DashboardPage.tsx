import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSun,
  CloudRain,
  Wind,
  Droplets,
  Sun,
  Eye,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import CidadeAgora from '../features/cidade/CidadeAgora';
import MapaCoropletico from '../features/cidade/MapaCoropletico';
import { CIDADE_ATUAL } from '../features/cidade/cidade';
import { ordenarPorRisco, resumoCidade } from '../features/cidade/areas';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { coresParaFaixa } from '../utils/risco';
import { slugify } from '../data/regioes-seo';

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, v) => a + v, 0) / valores.length;
}

/**
 * Dashboard B (SP3): "{Cidade} agora" com a distribuição e o mapa coroplético, as mais
 * críticas e o clima médio. Sem métricas por zona; parametrizado pela cidade (E1-ready).
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { subprefeituras: subs, carregando, erro, recarregar, ultimaAtualizacao } = useSubprefeituras();

  const resumo = useMemo(() => resumoCidade(subs), [subs]);
  const top = useMemo(() => ordenarPorRisco(subs).filter((s) => s.scoreAtual != null).slice(0, 6), [subs]);
  const cores = useMemo(() => Object.fromEntries(subs.map((s) => [slugify(s.nome), coresParaFaixa(s.faixaRisco).fill])), [subs]);
  const clima = useMemo(() => {
    const leituras = subs.map((s) => s.ultimaLeitura).filter((l): l is NonNullable<typeof l> => l != null);
    if (leituras.length === 0) return null;
    return {
      chuva: media(leituras.map((l) => l.chuvaMmH)),
      vento: media(leituras.map((l) => l.ventoKmH)),
      umidade: media(leituras.map((l) => l.umidade)),
      uv: media(leituras.map((l) => l.indiceUv)),
      visibilidade: media(leituras.map((l) => l.visibilidadeKm)),
      sensacao: media(leituras.map((l) => l.sensacaoTermica)),
    };
  }, [subs]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main
        className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 pb-20 md:pb-8 flex flex-col gap-5"
        style={{ paddingTop: 72 }}
      >
        {/* Cabeçalho da página */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
            <p className="mt-0.5" style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              {`Panorama do risco climático em ${CIDADE_ATUAL.nome}`}
            </p>
          </div>
          <button
            onClick={recarregar}
            className="flex items-center justify-center gap-2 rounded-lg px-3 min-w-11 min-h-11 transition-colors"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: 13 }}
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {ultimaAtualizacao
                ? `Atualizado ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Atualizar'}
            </span>
          </button>
        </div>

        {carregando && subs.length === 0 && <LoadingSpinner mensagem="Carregando métricas..." className="h-60" />}
        {erro && <ErrorBanner mensagem={erro} onRetry={recarregar} />}

        {subs.length > 0 && (
          <>
            <CidadeAgora resumo={resumo} cidadeNome={CIDADE_ATUAL.nome} distribuicao>
              <div className="hidden sm:block" style={{ width: 150, flex: '0 0 auto' }}>
                <MapaCoropletico cores={cores} />
              </div>
            </CidadeAgora>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <GlassCard hover={false} padding="lg" className="lg:col-span-3">
                <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  Mais críticas agora
                </h2>
                {top.length === 0 ? (
                  <EmptyState card={false} Icon={CloudRain} animacao="radar" mensagem="Sem leituras disponíveis no momento." />
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {top.map((s, i) => {
                      const cor = coresParaFaixa(s.faixaRisco).fill;
                      const valor = Math.round(s.scoreAtual!.valor);
                      return (
                        <button key={s.id} type="button" onClick={() => navigate(`/app?regiao=${slugify(s.nome)}`)}
                          className="regiao-card regiao-card-linha text-left" style={{ marginBottom: 0 }}>
                          <span className="font-mono flex-shrink-0 w-5 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{i + 1}</span>
                          <div className="min-w-0" style={{ width: 120 }}>
                            <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.nome}</p>
                            <p className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.zona}</p>
                          </div>
                          <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }} aria-hidden="true">
                            <span className="block h-full rounded-full barra-progresso" style={{ width: `${Math.min(valor, 100)}%`, background: cor, animationDelay: `${i * 60}ms` }} />
                          </span>
                          <span className="font-mono w-8 text-right" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{valor}</span>
                          <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              {clima && (
                <GlassCard hover={false} padding="lg" className="lg:col-span-2">
                  <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                    Clima na cidade
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { Icon: CloudRain, label: 'Chuva', valor: clima.chuva, sufixo: 'mm/h', cor: '#3b82f6' },
                      { Icon: Wind, label: 'Vento', valor: clima.vento, sufixo: 'km/h', cor: '#94a3b8' },
                      { Icon: Droplets, label: 'Umidade', valor: clima.umidade, sufixo: '%', cor: '#06b6d4' },
                      { Icon: Sun, label: 'Índice UV', valor: clima.uv, sufixo: '', cor: '#eab308' },
                      { Icon: Eye, label: 'Visibilidade', valor: clima.visibilidade, sufixo: 'km', cor: '#8b5cf6' },
                      { Icon: ThermometerSun, label: 'Sensação', valor: clima.sensacao, sufixo: '°C', cor: '#f43f5e' },
                    ].map(({ Icon, label, valor, sufixo, cor }) => (
                      <div key={label} className="painel-card-glass rounded-xl p-3 flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${cor}1f` }}>
                          <Icon size={17} style={{ color: cor }} />
                        </div>
                        <div className="leading-none">
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                            {valor.toFixed(1)}
                          </span>
                          {sufixo && <span className="ml-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sufixo}</span>}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
