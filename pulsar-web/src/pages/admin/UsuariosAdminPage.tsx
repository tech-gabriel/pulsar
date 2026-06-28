import { useState } from 'react';
import { ShieldCheck, ShieldAlert, UserCheck, UserX, Users, Trash2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import Header from '../../components/ui/Header';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import EmptyState from '../../components/ui/EmptyState';
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
  const { usuarios, carregando, erro, alterarRole, alterarAtivo, excluir, recarregar } = useUsuariosAdmin();
  const [excluindo, setExcluindo] = useState<UsuarioAdminDto | null>(null);

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
        ) : usuarios.length === 0 ? (
          <EmptyState Icon={Users} mensagem="Nenhum usuário cadastrado por aqui ainda." />
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
                  onExcluir={() => setExcluindo(u)}
                />
              ))}
            </div>
          </GlassCard>
        )}
      </main>

      <AnimatePresence>
        {excluindo && (
          <ModalExcluir
            alvo={excluindo}
            onCancelar={() => setExcluindo(null)}
            onConfirmar={async () => {
              const id = excluindo.id;
              setExcluindo(null);
              await excluir(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalExcluir({ alvo, onCancelar, onConfirmar }: {
  alvo: UsuarioAdminDto;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const confere = texto.trim().toLowerCase() === alvo.email.toLowerCase();

  return (
    <motion.div
      className="fixed inset-0 z-[1100] grid place-items-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURACAO.rapida }}
      onClick={onCancelar}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar exclusão de conta"
    >
      <motion.div
        className="w-full max-w-[420px]"
        style={{ background: 'var(--bg-glass)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-glass)', borderRadius: 16, padding: 22, boxShadow: 'var(--glass-shadow), 0 20px 60px rgba(0,0,0,0.4)' }}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            <AlertTriangle size={18} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
            Excluir conta
          </h3>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Esta ação é <strong style={{ color: 'var(--text-primary)' }}>permanente</strong> e remove a conta de{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{alvo.nome}</strong> e todos os seus dados (favoritos, alertas e inscrições).
        </p>
        <p className="mt-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Para confirmar, digite o e-mail da conta:
        </p>
        <p className="mt-1 font-mono" style={{ fontSize: 13, color: 'var(--text-accent)', wordBreak: 'break-all' }}>
          {alvo.email}
        </p>

        <input
          className="input-glass mt-2"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite o e-mail para confirmar"
          autoFocus
          autoComplete="off"
          aria-label="E-mail de confirmação"
        />

        <div className="flex justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg px-4 py-2 transition-colors"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={!confere}
            className="rounded-lg px-4 py-2 transition-all flex items-center gap-1.5"
            style={{ background: confere ? '#ef4444' : 'var(--bg-input)', color: confere ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (confere ? '#ef4444' : 'var(--border-glass)'), fontSize: 13.5, fontWeight: 600, cursor: confere ? 'pointer' : 'not-allowed' }}
          >
            <Trash2 size={15} /> Excluir conta
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LinhaUsuario({ u, ehVoce, podeEditar, onRole, onAtivo, onExcluir }: {
  u: UsuarioAdminDto;
  ehVoce: boolean;
  podeEditar: boolean;
  onRole: (role: RoleAcesso) => void;
  onAtivo: (ativo: boolean) => void;
  onExcluir: () => void;
}) {
  const meta = perfilMeta(u.perfil);
  // Anti-lockout: o admin não altera a própria role/status pela tela.
  const editavel = podeEditar && !ehVoce;
  // Exclusão só de contas não-admin (admins são protegidos no back e no front).
  const podeExcluir = editavel && u.role !== 'ADMIN';

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

      {/* Excluir conta (apenas ADMIN, alvo não-admin e não a própria conta) */}
      {podeExcluir && (
        <button
          type="button"
          onClick={onExcluir}
          title="Excluir conta"
          aria-label={`Excluir conta de ${u.nome}`}
          className="flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Trash2 size={17} />
        </button>
      )}
    </div>
  );
}
