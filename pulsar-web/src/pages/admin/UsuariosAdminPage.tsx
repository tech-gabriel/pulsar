import { ShieldCheck, ShieldAlert, UserCheck, UserX, Users } from 'lucide-react';
import Header from '../../components/ui/Header';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import AdminSubnav from '../../components/admin/AdminSubnav';
import { useAuth } from '../../contexts/AuthContext';
import { useUsuariosAdmin } from '../../hooks/useUsuariosAdmin';
import { perfilMeta } from '../../utils/perfil';
import type { RoleAcesso, UsuarioAdminDto } from '../../types';

const ROLES: { valor: RoleAcesso; label: string }[] = [
  { valor: 'USUARIO', label: 'Usuário' },
  { valor: 'SUPORTE', label: 'Suporte' },
  { valor: 'ADMIN', label: 'Admin' },
];

const ROLE_COR: Record<RoleAcesso, string> = {
  USUARIO: 'var(--text-muted)',
  SUPORTE: '#3b82f6',
  ADMIN: '#a855f7',
};

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

export default function UsuariosAdminPage() {
  const { usuario } = useAuth();
  const { usuarios, carregando, erro, alterarRole, alterarAtivo, recarregar } = useUsuariosAdmin();

  // SUPORTE tem acesso somente leitura; apenas ADMIN edita.
  const podeEditar = usuario?.role === 'ADMIN';

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 900, paddingTop: 80, paddingBottom: 80 }}>
        <AdminSubnav />
        <div className="mb-5 flex items-center gap-2.5">
          <Users size={22} style={{ color: 'var(--text-accent)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
            Usuários
          </h1>
          {!podeEditar && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: 11.5 }}
            >
              <ShieldAlert size={12} /> Somente leitura
            </span>
          )}
        </div>

        {carregando ? (
          <div className="py-20 grid place-items-center">
            <LoadingSpinner />
          </div>
        ) : erro ? (
          <ErrorBanner mensagem="Não foi possível carregar os usuários." onRetry={recarregar} />
        ) : (
          <GlassCard hover={false} padding="lg">
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {usuarios.map((u) => (
                <LinhaUsuario
                  key={u.id}
                  u={u}
                  ehVoce={u.id === usuario?.id}
                  podeEditar={podeEditar}
                  onRole={(r) => alterarRole(u.id, r)}
                  onAtivo={(a) => alterarAtivo(u.id, a)}
                />
              ))}
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}

function LinhaUsuario({ u, ehVoce, podeEditar, onRole, onAtivo }: {
  u: UsuarioAdminDto;
  ehVoce: boolean;
  podeEditar: boolean;
  onRole: (role: RoleAcesso) => void;
  onAtivo: (ativo: boolean) => void;
}) {
  const meta = perfilMeta(u.perfil);
  // Anti-lockout: o admin não altera a própria role/status pela tela.
  const editavel = podeEditar && !ehVoce;

  return (
    <div className="flex items-center gap-3 py-3" style={{ opacity: u.ativo ? 1 : 0.55 }}>
      <div
        className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0"
        style={{ background: `${meta.cor}22`, border: `1px solid ${meta.cor}55`, color: meta.cor }}
      >
        <meta.Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {u.nome}
          {ehVoce && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(você)</span>}
        </p>
        <p className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</p>
      </div>

      <span className="hidden sm:block" style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 78 }}>
        {dataCurta(u.criadoEm)}
      </span>

      {/* Role: select editável para ADMIN, badge para leitura/própria conta */}
      {editavel ? (
        <select
          className="input-glass"
          style={{ width: 120, padding: '6px 8px', fontSize: 13, color: ROLE_COR[u.role] }}
          value={u.role}
          onChange={(e) => onRole(e.target.value as RoleAcesso)}
          aria-label={`Role de ${u.nome}`}
        >
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>{r.label}</option>
          ))}
        </select>
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
          style={{ background: `${ROLE_COR[u.role]}1f`, border: `1px solid ${ROLE_COR[u.role]}44`, color: ROLE_COR[u.role], fontSize: 12, fontWeight: 600, minWidth: 92, justifyContent: 'center' }}
        >
          {u.role === 'ADMIN' && <ShieldCheck size={12} />}
          {ROLES.find((r) => r.valor === u.role)?.label ?? u.role}
        </span>
      )}

      {/* Ativo: botão de alternância para ADMIN; ícone estático caso contrário */}
      {editavel ? (
        <button
          type="button"
          onClick={() => onAtivo(!u.ativo)}
          title={u.ativo ? 'Desativar conta' : 'Ativar conta'}
          aria-label={u.ativo ? 'Desativar conta' : 'Ativar conta'}
          className="flex-shrink-0 transition-colors"
          style={{ color: u.ativo ? '#22c55e' : '#ef4444' }}
        >
          {u.ativo ? <UserCheck size={18} /> : <UserX size={18} />}
        </button>
      ) : (
        <span className="flex-shrink-0" title={u.ativo ? 'Ativo' : 'Inativo'} style={{ color: u.ativo ? '#22c55e' : '#ef4444' }}>
          {u.ativo ? <UserCheck size={18} /> : <UserX size={18} />}
        </span>
      )}
    </div>
  );
}
