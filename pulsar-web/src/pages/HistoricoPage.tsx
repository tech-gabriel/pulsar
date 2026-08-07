import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ArrowLeft, CloudRain, Wind, Eye, Sun, BarChart3 } from 'lucide-react';
import { useHistorico } from '../hooks/useHistorico';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';
import BadgeRisco from '../components/ui/BadgeRisco';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';

interface LocationState {
  regiaoNome?: string;
  subNome?: string;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload, label, isLight }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isLight?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="text-xs"
      style={{
        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 47, 74, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isLight ? 'rgba(0, 105, 168, 0.2)' : 'rgba(0, 188, 255, 0.15)'}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: 'var(--text-primary)',
      }}
    >
      <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span className="font-mono font-semibold" style={{ color: entry.color }}>
            {entry.value?.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HistoricoPage() {
  const { subprefeituraId } = useParams<{ subprefeituraId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const axisMuted = isLight ? 'rgba(71, 85, 105, 0.65)' : 'rgba(184, 230, 254, 0.5)';
  const gridStroke = isLight ? 'rgba(0, 105, 168, 0.12)' : 'rgba(0, 188, 255, 0.06)';

  const { historico, carregando, erro, recarregar } = useHistorico(subprefeituraId ?? null);

  const dados = historico?.leituras.map((l) => ({
    hora: formatarHora(l.timestamp),
    score: l.score?.valor ?? null,
    chuva: l.chuvaMmH,
    vento: l.ventoKmH,
    visibilidade: l.visibilidadeKm,
    uv: l.indiceUv,
    faixa: l.score?.faixa ?? null,
  })) ?? [];

  const ultima = historico?.leituras[historico.leituras.length - 1] ?? null;
  const semDados = !carregando && historico?.leituras.length === 0;

  // Resumo min / médio / máximo do score (ETAPA 5.5)
  const scores = dados.map((d) => d.score).filter((v): v is number => v != null);
  const resumo = scores.length > 0
    ? {
        min: Math.min(...scores),
        med: scores.reduce((a, v) => a + v, 0) / scores.length,
        max: Math.max(...scores),
      }
    : null;

  // Altura e rotação dos labels do eixo X conforme viewport
  const chartHeight = isMobile ? 250 : 360;
  const xAxisProps = isMobile
    ? { angle: -45, textAnchor: 'end' as const, height: 48, tick: { fontSize: 9, fill: axisMuted } }
    : { angle: 0, textAnchor: 'middle' as const, height: 20, tick: { fontSize: 11, fill: axisMuted } };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 pb-20 md:pb-8 flex flex-col gap-5 sm:gap-6" style={{ paddingTop: 72 }}>

        {/* Header da página */}
        <GlassCard hover={false} padding="lg" className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate(-1)}
            className="transition-colors flex items-center gap-1.5 flex-shrink-0 hover:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm hidden sm:inline">Voltar</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
              <h1
                className="truncate"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' }}
              >
                {historico?.subprefeituraNome ?? state?.subNome ?? 'Histórico'}
              </h1>
            </div>
            {state?.regiaoNome && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>Região: {state.regiaoNome}</p>
            )}
          </div>
          {ultima?.score && (
            <BadgeRisco faixa={ultima.score.faixa} score={ultima.score.valor} />
          )}
        </GlassCard>

        {carregando && <LoadingSpinner mensagem="Carregando histórico..." className="h-60" />}

        {erro && <ErrorBanner mensagem={erro} onRetry={recarregar} />}

        {semDados && (
          <EmptyState
            Icon={BarChart3}
            animacao="radar"
            titulo="Histórico insuficiente"
            mensagem="São necessárias pelo menos 2 leituras para exibir o gráfico. Volte mais tarde para acompanhar a evolução."
          />
        )}

        {/* Cards de variáveis atuais */}
        {ultima && !carregando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: CloudRain, label: 'Chuva',        valor: ultima.chuvaMmH,       unidade: 'mm/h', cor: '#3b82f6' },
              { icon: Wind,      label: 'Vento',        valor: ultima.ventoKmH,       unidade: 'km/h', cor: '#94a3b8' },
              { icon: Eye,       label: 'Visibilidade', valor: ultima.visibilidadeKm, unidade: 'km',   cor: '#f59e0b' },
              { icon: Sun,       label: 'Índice UV',    valor: ultima.indiceUv,       unidade: '',     cor: '#eab308' },
            ].map(({ icon: Icon, label, valor, unidade, cor }) => (
              <GlassCard key={label} padding="md" className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cor}26` }}
                >
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {valor.toFixed(1)}{' '}
                    <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>{unidade}</span>
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Score ao longo do tempo */}
        {dados.length >= 2 && (
          <GlassCard hover={false} padding="lg">
            <h2
              className="mb-4"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}
            >
              Histórico das últimas 24 horas
            </h2>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={dados} margin={{ top: 4, right: 8, bottom: xAxisProps.height - 20, left: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00A6F4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00A6F4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="hora"
                  tick={xAxisProps.tick}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  interval="preserveStartEnd"
                  angle={xAxisProps.angle}
                  textAnchor={xAxisProps.textAnchor}
                  height={xAxisProps.height}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: axisMuted }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip isLight={isLight} />} cursor={{ stroke: isLight ? 'rgba(0,132,209,0.25)' : 'rgba(0,188,255,0.2)' }} />
                <ReferenceLine
                  y={30}
                  stroke="rgba(34,197,94,0.4)"
                  strokeDasharray="5 5"
                  label={{ value: '30', position: 'right', fill: axisMuted, fontSize: 10 }}
                />
                <ReferenceLine
                  y={60}
                  stroke="rgba(239,68,68,0.4)"
                  strokeDasharray="5 5"
                  label={{ value: '60', position: 'right', fill: axisMuted, fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#00A6F4"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  dot={{ fill: '#00A6F4', stroke: 'var(--bg-primary)', strokeWidth: 2, r: 3 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* Resumo do score */}
        {resumo && (
          <GlassCard hover={false} padding="lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {[
                { label: 'Score Mínimo', valor: resumo.min, cor: '#22c55e' },
                { label: 'Score Médio',  valor: resumo.med, cor: 'var(--color-pulsar-400)' },
                { label: 'Score Máximo', valor: resumo.max, cor: '#ef4444' },
              ].map(({ label, valor, cor }) => (
                <div key={label}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color: cor }}>
                    {valor.toFixed(0)}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Variáveis climáticas ao longo do tempo */}
        {dados.length >= 2 && (
          <GlassCard hover={false} padding="lg">
            <h2
              className="mb-4"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}
            >
              Variáveis Climáticas
            </h2>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={dados} margin={{ top: 4, right: 8, bottom: xAxisProps.height - 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="hora"
                  tick={xAxisProps.tick}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  interval="preserveStartEnd"
                  angle={xAxisProps.angle}
                  textAnchor={xAxisProps.textAnchor}
                  height={xAxisProps.height}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: axisMuted }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip isLight={isLight} />} cursor={{ stroke: isLight ? 'rgba(0,132,209,0.25)' : 'rgba(0,188,255,0.2)' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: isMobile ? '10px' : '11px', paddingTop: '8px', color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="chuva"        name="Chuva (mm/h)"  stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vento"        name="Vento (km/h)"  stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visibilidade" name="Visib. (km)"   stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uv"           name="Índice UV"     stroke="#f97316" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
