import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Map, History, BarChart3, Newspaper, Settings, Bell, Sun, Moon, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useAlertas } from '../../contexts/AlertasContext';
import { useTheme } from '../../hooks/useTheme';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import BadgeRisco from './BadgeRisco';
import iconePulsar from '../../assets/logos/pulsar-icone.svg';

// Abas de navegação principal (ETAPA B.1.2)
const TABS: { to: string; label: string; curto: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: '/app', label: 'Mapa', curto: 'Mapa', Icon: Map, end: true },
  { to: '/app/historico', label: 'Histórico', curto: 'Hist.', Icon: History },
  { to: '/app/dashboard', label: 'Dashboard', curto: 'Dash', Icon: BarChart3 },
  { to: '/app/noticias', label: 'Notícias', curto: 'News', Icon: Newspaper },
  { to: '/app/configuracoes', label: 'Configurações', curto: 'Config', Icon: Settings },
];

/**
 * Header de navegação principal (ETAPA B.1). No desktop/tablet é uma barra única
 * (logo + abas centrais + ações). No mobile divide-se em top bar (logo + ações)
 * e uma tab bar fixa no rodapé. O sino abre um painel ao vivo com as regiões em
 * risco alto (alimentado pelo AlertasProvider, global a todas as páginas).
 */
export default function Header() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { alertas } = useAlertas();
  const navigate = useNavigate();

  const [painelAberto, setPainelAberto] = useState(false);
  const sinoRef = useRef<HTMLDivElement>(null);

  const temAlertas = alertas.length > 0;

  // Fecha o painel ao clicar fora ou pressionar Esc.
  useEffect(() => {
    if (!painelAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (sinoRef.current && !sinoRef.current.contains(e.target as Node)) setPainelAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setPainelAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [painelAberto]);

  // Acesso administrativo (ADMIN/SUPORTE) vive no top bar, não na tab bar inferior.
  const ehAdmin = usuario?.role === 'ADMIN' || usuario?.role === 'SUPORTE';

  function irParaRegiao() {
    setPainelAberto(false);
    navigate('/app');
  }

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
          {TABS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => ['nav-tab', isActive ? 'ativa' : ''].join(' ')}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Direita: ações */}
        <div className="flex items-center gap-3">
          {/* Acesso ao painel admin (só ADMIN/SUPORTE) — fica no topo, fora da tab bar */}
          {ehAdmin && (
            <NavLink
              to="/app/admin/usuarios"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex"
              title="Painel administrativo"
              aria-label="Admin"
            >
              <ShieldCheck size={20} />
            </NavLink>
          )}

          {/* Toggle de tema (longe do logout para evitar cliques acidentais) */}
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

          {/* Sino de notificações + painel ao vivo */}
          <div className="relative" ref={sinoRef}>
            <button
              type="button"
              onClick={() => setPainelAberto((v) => !v)}
              className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex"
              title="Notificações"
              aria-label={temAlertas ? `Notificações: ${alertas.length} em alerta` : 'Notificações'}
              aria-haspopup="true"
              aria-expanded={painelAberto}
            >
              <Bell size={20} />
              {temAlertas && (
                <span className="notif-badge">{alertas.length > 9 ? '9+' : alertas.length}</span>
              )}
            </button>

            <AnimatePresence>
              {painelAberto && (
                <motion.div
                  className="notif-panel"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
                  role="dialog"
                  aria-label="Painel de notificações"
                >
                  <div className="notif-panel-head">
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      Alertas
                    </span>
                    {temAlertas && <span className="notif-count">{alertas.length}</span>}
                  </div>

                  {!temAlertas ? (
                    <div className="notif-empty">
                      <ShieldCheck size={26} style={{ color: '#22c55e' }} />
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tudo tranquilo em São Paulo
                      </p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        Nenhuma região em risco alto agora.
                      </p>
                    </div>
                  ) : (
                    <ul className="notif-list">
                      {alertas.map((r) => (
                        <li key={r.id}>
                          <button type="button" className="notif-item" onClick={irParaRegiao}>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {r.nome}
                              </p>
                              <p className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {r.totalSubprefeituras} subprefeituras
                              </p>
                            </div>
                            <BadgeRisco faixa={r.faixaRisco} score={r.scoreAgregado} size="sm" />
                            <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nome (md+) */}
          {usuario?.nome && (
            <span className="hidden md:inline" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
              {usuario.nome}
            </span>
          )}

          {/* Separador isolando o botão de sair */}
          <span style={{ width: 1, height: 24, background: 'var(--border-glass)' }} />

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
        {TABS.map(({ to, curto, Icon, end }) => (
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
