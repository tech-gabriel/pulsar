import { Activity, RefreshCw, Users, Lightbulb, Bell, Database, ShieldAlert } from 'lucide-react';
import Header from '../../components/ui/Header';
import GlassCard from '../../components/ui/GlassCard';
import KpiCard from '../../components/dashboard/KpiCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import AdminSubnav from '../../components/admin/AdminSubnav';
import { useAuth } from '../../contexts/AuthContext';
import { useSistemaAdmin } from '../../hooks/useSistemaAdmin';
import { dataAbsoluta, tempoRelativo } from '../../utils/data';

export default function SistemaAdminPage() {
  const { usuario } = useAuth();
  const { status, metricas, carregando, erro, coletando, forcarColeta, recarregar } = useSistemaAdmin();
  const podeColetar = usuario?.role === 'ADMIN';

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 900, paddingTop: 80, paddingBottom: 80 }}>
        <AdminSubnav />

        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Activity size={22} style={{ color: 'var(--text-accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
              Sistema
            </h1>
            {!podeColetar && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: 11.5 }}
              >
                <ShieldAlert size={12} /> Somente leitura
              </span>
            )}
          </div>
          {podeColetar && (
            <button
              type="button"
              onClick={forcarColeta}
              disabled={coletando || carregando}
              className="btn-gradient flex items-center gap-1.5 px-4 py-2"
              style={{ fontSize: 13.5, opacity: coletando ? 0.7 : 1 }}
            >
              <RefreshCw size={15} className={coletando ? 'animate-spin' : ''} />
              {coletando ? 'Coletando…' : 'Forçar coleta'}
            </button>
          )}
        </div>

        {carregando ? (
          <div className="py-20 grid place-items-center"><LoadingSpinner /></div>
        ) : erro || !status || !metricas ? (
          <ErrorBanner mensagem="Não foi possível carregar o painel de sistema." onRetry={recarregar} />
        ) : (
          <>
            {/* Métricas */}
            <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard Icon={Users} label="Usuários" valor={metricas.totalUsuarios} detalhe={`${metricas.usuariosAtivos} ativos · ${metricas.admins} admin · ${metricas.suportes} suporte`} cor="#a855f7" />
              <KpiCard Icon={Lightbulb} label="Sugestões" valor={metricas.totalSugestoes} detalhe={`${metricas.sugestoesAtivas} ativas`} cor="#f59e0b" />
              <KpiCard Icon={Bell} label="Alertas (24h)" valor={metricas.alertasUltimas24h} cor="#ef4444" />
              <KpiCard Icon={Database} label="Leituras (24h)" valor={metricas.leiturasUltimas24h} cor="#00BCFF" />
            </div>

            {/* Status da coleta */}
            <GlassCard hover={false} padding="lg" className="mb-5">
              <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                Coleta de dados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Indicador rotulo="Última coleta" valor={status.ultimaColeta ? tempoRelativo(status.ultimaColeta) : '—'} detalhe={status.ultimaColeta ? dataAbsoluta(status.ultimaColeta) : 'Sem registros'} />
                <Indicador rotulo="Cobertura" valor={`${status.subprefeiturasComLeitura}/${status.subprefeiturasAtivas}`} detalhe="subprefeituras com leitura" />
                <Indicador rotulo="Ciclo automático" valor={`${status.intervaloColetaMinutos} min`} detalhe="intervalo do coletor" />
              </div>
            </GlassCard>

            {/* Última leitura por subprefeitura */}
            <GlassCard hover={false} padding="lg">
              <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                Subprefeituras ({status.subprefeituras.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {status.subprefeituras.map((s) => (
                  <div key={s.nome} className="flex items-center justify-between gap-2 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="min-w-0 truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.nome}</span>
                    <span className="flex-shrink-0 flex items-center gap-1.5" style={{ fontSize: 12, color: s.ultimaLeitura ? 'var(--text-muted)' : '#ef4444' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.ultimaLeitura ? '#22c55e' : '#ef4444' }} />
                      {s.ultimaLeitura ? tempoRelativo(s.ultimaLeitura) : 'sem dados'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}
      </main>
    </div>
  );
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rotulo}</p>
      <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>{valor}</p>
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{detalhe}</p>
    </div>
  );
}
