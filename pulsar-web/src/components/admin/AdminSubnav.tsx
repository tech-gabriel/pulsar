import { NavLink } from 'react-router-dom';
import { Users, Lightbulb, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ITENS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/admin/usuarios', label: 'Usuários', Icon: Users },
  { to: '/admin/sugestoes', label: 'Sugestões', Icon: Lightbulb },
  { to: '/admin/sistema', label: 'Sistema', Icon: Activity },
];

/** Navegação entre as seções da área administrativa. */
export default function AdminSubnav() {
  return (
    <nav className="mb-5 flex items-center gap-2">
      {ITENS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            ['flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors', isActive ? 'admin-tab-ativa' : 'admin-tab'].join(' ')
          }
          style={({ isActive }) => ({
            fontSize: 13.5,
            fontWeight: 600,
            border: '1px solid var(--border-glass)',
            background: isActive ? 'var(--bg-glass-hover)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          })}
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
