import { NavLink } from 'react-router-dom';
import { Map, History, BarChart3, Newspaper, Settings, Bell, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

// Abas de navegação principal (ETAPA B.1.2)
const TABS: { to: string; label: string; curto: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Mapa', curto: 'Mapa', Icon: Map, end: true },
  { to: '/historico', label: 'Histórico', curto: 'Hist.', Icon: History },
  { to: '/dashboard', label: 'Dashboard', curto: 'Dash', Icon: BarChart3 },
  { to: '/noticias', label: 'Notícias', curto: 'News', Icon: Newspaper },
  { to: '/configuracoes', label: 'Configurações', curto: 'Config', Icon: Settings },
];

interface Props {
  /** Nº de regiões em risco ALTO — exibe badge pulsante no sino. */
  alertasAtivos?: number;
}

/**
 * Header de navegação principal (ETAPA B.1). No desktop/tablet é uma barra única
 * (logo + abas centrais + ações). No mobile divide-se em top bar (logo + ações)
 * e uma tab bar fixa no rodapé.
 */
export default function Header({ alertasAtivos = 0 }: Props) {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const temAlertas = alertasAtivos > 0;

  // Aba administrativa visível apenas para ADMIN e SUPORTE.
  const ehAdmin = usuario?.role === 'ADMIN' || usuario?.role === 'SUPORTE';
  const tabs = ehAdmin
    ? [...TABS, { to: '/admin/usuarios', label: 'Admin', curto: 'Admin', Icon: ShieldCheck }]
    : TABS;

  return (
    <>
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="app-header fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between h-12 md:h-16 px-4 md:px-6">
        {/* Esquerda: marca (ícone + slogan) */}
        <div className="flex items-center gap-2.5">
          <img
            src={iconePulsar}
            alt="Pulsar"
            className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0"
            style={{ filter: 'drop-shadow(var(--glow-cyan))' }}
          />
          <div className="flex flex-col justify-center leading-none">
            <span
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', textShadow: 'var(--glow-cyan)' }}
            >
              PULSAR
            </span>
            <span
              className="hidden md:block mt-0.5"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 11, color: 'var(--text-secondary)' }}
            >
              O mapa vivo da sua segurança
            </span>
          </div>
        </div>

        {/* Centro: abas (md+) — absolutamente centradas */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => ['nav-tab', isActive ? 'ativa' : ''].join(' ')}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Direita: ações */}
        <div className="flex items-center gap-3">
          {/* Sino de notificações */}
          <button
            type="button"
            className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell size={20} />
            {temAlertas && (
              <span className="bell-badge absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Separador + nome (md+) */}
          <span className="hidden md:block" style={{ width: 1, height: 24, background: 'var(--border-glass)' }} />
          {usuario?.nome && (
            <span className="hidden md:inline" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              {usuario.nome}
            </span>
          )}

          {/* Toggle de tema */}
          <button
            type="button"
            onClick={toggleTheme}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema"
          >
            <span key={theme} className="theme-icon-anim inline-flex">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Sair"
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── TAB BAR INFERIOR (mobile) ───────────────────────────────────────── */}
      <nav className="tabbar-mobile md:hidden fixed bottom-0 left-0 right-0 z-[1000] flex items-stretch h-12">
        {tabs.map(({ to, curto, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => ['tabbar-item justify-center', isActive ? 'ativa' : ''].join(' ')}
          >
            <Icon size={22} />
            <span>{curto}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
