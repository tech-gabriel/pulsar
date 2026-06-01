import { BarChart3 } from 'lucide-react';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';

/** Placeholder do Dashboard (ETAPA B.1.5). Métricas chegam numa etapa futura. */
export default function DashboardPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="flex items-center justify-center px-4" style={{ minHeight: '100dvh', paddingTop: 64, paddingBottom: 64 }}>
        <GlassCard hover={false} padding="lg" className="text-center w-full max-w-md !py-12">
          <BarChart3 size={64} className="mx-auto" style={{ color: 'var(--text-accent)' }} />
          <h1 className="mt-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, color: 'var(--text-primary)' }}>
            Dashboard em desenvolvimento
          </h1>
          <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Em breve: métricas de risco, tendências e estatísticas por região
          </p>
        </GlassCard>
      </main>
    </div>
  );
}
