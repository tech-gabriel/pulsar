import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Thermometer,
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
import BadgeRisco from '../components/ui/BadgeRisco';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import KpiCard from '../components/dashboard/KpiCard';
import { useRegioes } from '../hooks/useRegioes';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useTheme } from '../hooks/useTheme';
import { labelFaixa } from '../utils/risco';
import type { FaixaRisco } from '../types';

const FAIXA_FILL: Record<FaixaRisco, string> = {
  BAIXO: '#22c55e',
  MODERADO: '#eab308',
  ALTO: '#ef4444',
};

function faixaDoScore(score: number): FaixaRisco {
  if (score <= 30) return 'BAIXO';
  if (score <= 60) return 'MODERADO';
  return 'ALTO';
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, v) => a + v, 0) / valores.length;
}

function ChartTooltip({ active, payload, isLight }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { nome?: string; cor?: string } }>;
  isLight?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="text-xs"
      style={{
        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 47, 74, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isLight ? 'rgba(0, 105, 168, 0.2)' : 'rgba(0, 188, 255, 0.15)'}`,
        borderRadius: 8,
        padding: '8px 12px',
        color: 'var(--text-primary)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{item.payload.nome ?? item.name}: </span>
      <span className="font-mono font-semibold" style={{ color: item.payload.cor ?? 'var(--text-accent)' }}>
        {item.value.toFixed(item.value % 1 === 0 ? 0 : 1)}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const axisColor = isLight ? 'rgba(71, 85, 105, 0.65)' : 'rgba(184, 230, 254, 0.5)';
  const axisStrong = isLight ? '#475569' : '#B8E6FE';

  const { regioes, carregando, erro, recarregar, ultimaAtualizacao } = useRegioes();
  const subs = useSubprefeituras(regioes);

  const m = useMemo(() => {
    if (regioes.length === 0) return null;

    const scoresRegiao = regioes.map((r) => r.scoreAgregado);
    const scoreMaxCidade = Math.max(...scoresRegiao, 0);
    const faixaCidade = faixaDoScore(scoreMaxCidade);
    const regioesAlto = regioes.filter((r) => r.faixaRisco === 'ALTO').length;

    const porFaixa: Record<FaixaRisco, number> = { BAIXO: 0, MODERADO: 0, ALTO: 0 };
    for (const s of subs) porFaixa[s.faixaRisco] = (porFaixa[s.faixaRisco] ?? 0) + 1;

    const leituras = subs.map((s) => s.ultimaLeitura).filter((l): l is NonNullable<typeof l> => l != null);

    return {
      scoreMaxCidade,
      faixaCidade,
      regioesAlto,
      subsAlto: porFaixa.ALTO,
      tempMedia: media(subs.map((s) => s.temperaturaAtual)),
      porFaixa,
      ranking: [...regioes]
        .sort((a, b) => b.scoreAgregado - a.scoreAgregado)
        .map((r) => ({ nome: r.nome, score: Number(r.scoreAgregado.toFixed(1)), cor: FAIXA_FILL[r.faixaRisco] })),
      topSubs: [...subs]
        .filter((s) => s.scoreAtual != null)
        .sort((a, b) => (b.scoreAtual!.valor) - (a.scoreAtual!.valor))
        .slice(0, 6),
      clima: {
        chuva: media(leituras.map((l) => l.chuvaMmH)),
        vento: media(leituras.map((l) => l.ventoKmH)),
        umidade: media(leituras.map((l) => l.umidade)),
        uv: media(leituras.map((l) => l.indiceUv)),
        visibilidade: media(leituras.map((l) => l.visibilidadeKm)),
        sensacao: media(leituras.map((l) => l.sensacaoTermica)),
      },
    };
  }, [regioes, subs]);

  const donut = m
    ? (['ALTO', 'MODERADO', 'BAIXO'] as FaixaRisco[])
        .map((f) => ({ nome: labelFaixa(f), value: m.porFaixa[f], cor: FAIXA_FILL[f] }))
        .filter((d) => d.value > 0)
    : [];
  const totalSubs = subs.length;

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
              Panorama do risco climático em São Paulo
            </p>
          </div>
          <button
            onClick={recarregar}
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
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

        {carregando && regioes.length === 0 && <LoadingSpinner mensagem="Carregando métricas..." className="h-60" />}
        {erro && <ErrorBanner mensagem={erro} onRetry={recarregar} />}

        {m && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                Icon={Gauge}
                label="Score máximo da cidade"
                valor={m.scoreMaxCidade}
                decimais={1}
                detalhe={`Risco ${labelFaixa(m.faixaCidade)}`}
                cor={FAIXA_FILL[m.faixaCidade]}
              />
              <KpiCard
                Icon={ShieldAlert}
                label="Regiões em risco alto"
                valor={m.regioesAlto}
                sufixo={`/ ${regioes.length}`}
                detalhe="regiões monitoradas"
                cor={m.regioesAlto > 0 ? '#ef4444' : '#22c55e'}
              />
              <KpiCard
                Icon={AlertTriangle}
                label="Subprefeituras em alerta"
                valor={m.subsAlto}
                sufixo={totalSubs ? `/ ${totalSubs}` : ''}
                detalhe="em faixa de risco alto"
                cor={m.subsAlto > 0 ? '#ef4444' : '#22c55e'}
              />
              <KpiCard
                Icon={Thermometer}
                label="Temperatura média"
                valor={m.tempMedia}
                decimais={1}
                sufixo="°C"
                detalhe="média das subprefeituras"
                cor="#f97316"
              />
            </div>

            {/* Distribuição + Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Donut de distribuição */}
              <GlassCard hover={false} padding="lg" className="lg:col-span-2">
                <h2 className="mb-2" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  Distribuição por risco
                </h2>
                {totalSubs === 0 ? (
                  <EmptyState card={false} Icon={Gauge} mensagem="Sem dados de subprefeituras por enquanto." />
                ) : (
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={donut} dataKey="value" nameKey="nome" cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="none">
                          {donut.map((d) => (
                            <Cell key={d.nome} fill={d.cor} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip isLight={isLight} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, color: 'var(--text-primary)' }}>
                        {totalSubs}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>monitoradas</span>
                    </div>
                  </div>
                )}
                {/* Legenda */}
                <div className="flex justify-center gap-4 mt-3 flex-wrap">
                  {(['BAIXO', 'MODERADO', 'ALTO'] as FaixaRisco[]).map((f) => (
                    <div key={f} className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: FAIXA_FILL[f] }} />
                      {labelFaixa(f)} <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{m.porFaixa[f]}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Ranking de regiões */}
              <GlassCard hover={false} padding="lg" className="lg:col-span-3">
                <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  Score por região
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={m.ranking} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap={10}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 12, fill: axisStrong }}
                      tickLine={false}
                      axisLine={false}
                      width={62}
                    />
                    <Tooltip content={<ChartTooltip isLight={isLight} />} cursor={{ fill: isLight ? 'rgba(0,132,209,0.08)' : 'rgba(0,188,255,0.06)' }} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                      {m.ranking.map((r) => (
                        <Cell key={r.nome} fill={r.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            {/* Top subprefeituras + Médias climáticas */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Top subprefeituras críticas */}
              <GlassCard hover={false} padding="lg" className="lg:col-span-3">
                <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  Subprefeituras mais críticas
                </h2>
                <div className="flex flex-col gap-2">
                  {m.topSubs.length === 0 && (
                    <EmptyState card={false} Icon={AlertTriangle} mensagem="Sem leituras disponíveis no momento." />
                  )}
                  {m.topSubs.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/app/historico/${s.id}`, { state: { subNome: s.nome, regiaoNome: s.regiaoNome } })}
                      className="regiao-card flex items-center gap-3 text-left"
                      style={{ marginBottom: 0 }}
                    >
                      <span className="font-mono flex-shrink-0 w-5 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.nome}</p>
                        <p className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.regiaoNome}</p>
                      </div>
                      <BadgeRisco faixa={s.faixaRisco} score={s.scoreAtual?.valor} size="sm" />
                      <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </GlassCard>

              {/* Médias climáticas */}
              <GlassCard hover={false} padding="lg" className="lg:col-span-2">
                <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  Médias climáticas
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { Icon: CloudRain, label: 'Chuva', valor: m.clima.chuva, sufixo: 'mm/h', cor: '#3b82f6' },
                    { Icon: Wind, label: 'Vento', valor: m.clima.vento, sufixo: 'km/h', cor: '#94a3b8' },
                    { Icon: Droplets, label: 'Umidade', valor: m.clima.umidade, sufixo: '%', cor: '#06b6d4' },
                    { Icon: Sun, label: 'Índice UV', valor: m.clima.uv, sufixo: '', cor: '#eab308' },
                    { Icon: Eye, label: 'Visibilidade', valor: m.clima.visibilidade, sufixo: 'km', cor: '#8b5cf6' },
                    { Icon: ThermometerSun, label: 'Sensação', valor: m.clima.sensacao, sufixo: '°C', cor: '#f43f5e' },
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
