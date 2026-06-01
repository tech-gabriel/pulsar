import { Sun, Moon, User, Mail, LogOut } from 'lucide-react';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

/** Configurações do usuário (ETAPA B.1.5): tema, conta e logout. */
export default function ConfiguracoesPage() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 600, paddingTop: 80, paddingBottom: 80 }}>
        <h1 className="mb-5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
          Configurações
        </h1>

        {/* Aparência */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
            Aparência
          </h2>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between"
            aria-pressed={!dark}
          >
            <span className="flex items-center gap-3">
              {dark ? <Moon size={20} style={{ color: 'var(--text-accent)' }} /> : <Sun size={20} style={{ color: 'var(--text-accent)' }} />}
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{dark ? 'Tema escuro' : 'Tema claro'}</span>
            </span>
            <span className={['theme-switch', dark ? '' : 'on'].join(' ')}>
              <span className="theme-switch-knob" />
            </span>
          </button>
        </GlassCard>

        {/* Conta */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
            Conta
          </h2>
          <div className="flex items-center gap-3 py-2">
            <User size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nome</p>
              <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{usuario?.nome ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <Mail size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>E-mail</p>
              <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{usuario?.email ?? '—'}</p>
            </div>
          </div>
        </GlassCard>

        {/* Sair */}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-3 transition-colors"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Sair da conta</span>
        </button>
      </main>
    </div>
  );
}
