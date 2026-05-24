import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
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
import BadgeRisco from '../components/ui/BadgeRisco';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBanner from '../components/ui/ErrorBanner';

interface LocationState {
  regiaoNome?: string;
  subNome?: string;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
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

  const { historico, carregando, erro } = useHistorico(subprefeituraId ?? null);

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

  // Altura e rotação dos labels do eixo X conforme viewport
  const chartHeight = isMobile ? 260 : 360;
  const xAxisProps = isMobile
    ? { angle: -45, textAnchor: 'end' as const, height: 48, tick: { fontSize: 9, fill: '#94a3b8' } }
    : { angle: 0, textAnchor: 'middle' as const, height: 20, tick: { fontSize: 11, fill: '#94a3b8' } };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-pulsar-950 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-pulsar-300 hover:text-white transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          <ArrowLeft size={20} />
          <span className="text-sm hidden sm:inline">Voltar</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-pulsar-400 flex-shrink-0" />
            <h1
              className="text-sm sm:text-base font-bold truncate"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {historico?.subprefeituraNome ?? state?.subNome ?? 'Histórico'}
            </h1>
          </div>
          {state?.regiaoNome && (
            <p className="text-xs text-pulsar-300 mt-0.5 truncate">Região: {state.regiaoNome}</p>
          )}
        </div>
        <span className="text-xs text-pulsar-300 flex-shrink-0">Últimas 24h</span>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 sm:py-6 flex flex-col gap-5 sm:gap-6">

        {carregando && <LoadingSpinner mensagem="Carregando histórico..." className="h-60" />}

        {erro && <ErrorBanner mensagem={erro} onRetry={() => window.location.reload()} />}

        {semDados && (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-slate-400">
            <BarChart3 size={40} />
            <p className="text-base font-medium">Histórico insuficiente</p>
            <p className="text-sm text-center">São necessárias pelo menos 2 leituras para exibir o gráfico.</p>
          </div>
        )}

        {/* Cards de variáveis atuais */}
        {ultima && !carregando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: CloudRain, label: 'Chuva',       valor: ultima.chuvaMmH,       unidade: 'mm/h', cor: '#3b82f6' },
              { icon: Wind,      label: 'Vento',       valor: ultima.ventoKmH,       unidade: 'km/h', cor: '#f59e0b' },
              { icon: Eye,       label: 'Visibilidade', valor: ultima.visibilidadeKm, unidade: 'km',   cor: '#8b5cf6' },
              { icon: Sun,       label: 'Índice UV',   valor: ultima.indiceUv,       unidade: '',     cor: '#f97316' },
            ].map(({ icon: Icon, label, valor, unidade, cor }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cor}18` }}
                >
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">{label}</p>
                  <p className="font-mono text-sm font-semibold text-slate-800">
                    {valor.toFixed(1)}{' '}
                    <span className="text-slate-400 font-normal text-xs">{unidade}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Score ao longo do tempo */}
        {dados.length >= 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Score de Perigo
              </h2>
              {ultima?.score && (
                <BadgeRisco faixa={ultima.score.faixa} score={ultima.score.valor} />
              )}
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={dados} margin={{ top: 4, right: 8, bottom: xAxisProps.height - 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="hora"
                  tick={xAxisProps.tick}
                  tickLine={false}
                  interval="preserveStartEnd"
                  angle={xAxisProps.angle}
                  textAnchor={xAxisProps.textAnchor}
                  height={xAxisProps.height}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#0084D1"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Variáveis climáticas ao longo do tempo */}
        {dados.length >= 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h2
              className="text-sm font-semibold text-slate-700 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Variáveis Climáticas
            </h2>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={dados} margin={{ top: 4, right: 8, bottom: xAxisProps.height - 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="hora"
                  tick={xAxisProps.tick}
                  tickLine={false}
                  interval="preserveStartEnd"
                  angle={xAxisProps.angle}
                  textAnchor={xAxisProps.textAnchor}
                  height={xAxisProps.height}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: isMobile ? '10px' : '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="chuva"        name="Chuva (mm/h)"  stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vento"        name="Vento (km/h)"  stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visibilidade" name="Visib. (km)"   stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uv"           name="Índice UV"     stroke="#f97316" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
