import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun, Moon, Mail, LogOut, Pencil, Check, X, Eye, EyeOff,
  Lock, Star, ChevronRight, Bell,
} from 'lucide-react';
import Header from '../components/ui/Header';
import GlassCard from '../components/ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../contexts/ToastContext';
import { useNotificacoesPrefs, type NotificacoesPrefs } from '../hooks/useNotificacoesPrefs';
import { useFavoritos } from '../hooks/useFavoritos';
import { PERFIS, perfilMeta } from '../utils/perfil';
import type { TipoPerfil } from '../types';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function senhaInvalida(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if ((senha.match(/\d/g) ?? []).length < 2) return 'A senha deve conter ao menos 2 números.';
  if (!/[^a-zA-Z0-9]/.test(senha)) return 'A senha deve conter ao menos 1 caractere especial.';
  return null;
}

/** Cabeçalho de seção reutilizável. */
function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
      {children}
    </h2>
  );
}

/** Linha com label/descrição + switch (estilo theme-switch). */
function SwitchRow({ titulo, descricao, ligado, onToggle }: {
  titulo: string; descricao: string; ligado: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={ligado} className="w-full flex items-center justify-between gap-3 py-2.5 text-left">
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{titulo}</span>
        <span className="block" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{descricao}</span>
      </span>
      <span className={['theme-switch', ligado ? 'on' : ''].join(' ')}>
        <span className="theme-switch-knob" />
      </span>
    </button>
  );
}

export default function ConfiguracoesPage() {
  const { usuario, logout, atualizarPerfil } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { prefs, toggle } = useNotificacoesPrefs();
  const { favoritos } = useFavoritos(usuario?.id ?? null);
  const dark = theme === 'dark';

  const metaAtual = perfilMeta(usuario?.perfil);

  // --- Estado de edição do perfil ---
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [perfil, setPerfil] = useState<TipoPerfil>(usuario?.perfil ?? 'CIDADAO');
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    setNome(usuario?.nome ?? '');
    setEmail(usuario?.email ?? '');
    setPerfil(usuario?.perfil ?? 'CIDADAO');
    setTrocarSenha(false);
    setSenhaAtual('');
    setNovaSenha('');
    setEditando(true);
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    if (trocarSenha) {
      const erro = senhaInvalida(novaSenha);
      if (erro) { showToast(erro, 'error'); return; }
      if (!senhaAtual) { showToast('Informe a senha atual para trocá-la.', 'error'); return; }
    }
    setSalvando(true);
    try {
      await atualizarPerfil({
        nome,
        email,
        perfil,
        ...(trocarSenha ? { senhaAtual, novaSenha } : {}),
      });
      showToast('Perfil atualizado com sucesso!', 'success');
      setEditando(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem;
      showToast(msg ?? 'Não foi possível atualizar o perfil.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  const notifs: { chave: keyof NotificacoesPrefs; titulo: string; descricao: string }[] = [
    { chave: 'alertaAlto', titulo: 'Alertas de risco alto', descricao: 'Avisar quando uma região entrar em risco alto' },
    { chave: 'alertaModerado', titulo: 'Alertas de risco moderado', descricao: 'Avisar já a partir da faixa moderada' },
    { chave: 'resumoDiario', titulo: 'Resumo diário', descricao: 'Um resumo do clima da sua região, uma vez por dia' },
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 640, paddingTop: 80, paddingBottom: 80 }}>
        <h1 className="mb-5" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
          Configurações
        </h1>

        {/* ── PERFIL ──────────────────────────────────────────────────────── */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <div className="flex items-center justify-between">
            <SecaoTitulo>Perfil</SecaoTitulo>
            {!editando && (
              <button
                type="button"
                onClick={abrirEdicao}
                className="flex items-center gap-1.5 text-pulsar-400 hover:underline"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                <Pencil size={14} /> Editar
              </button>
            )}
          </div>

          {!editando ? (
            <>
              {/* Visão (read-only) */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full grid place-items-center flex-shrink-0"
                  style={{ background: `${metaAtual.cor}22`, border: `1px solid ${metaAtual.cor}55`, color: metaAtual.cor, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}
                >
                  {iniciais(usuario?.nome ?? '')}
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{usuario?.nome ?? '—'}</p>
                  <p className="truncate flex items-center gap-1.5" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <Mail size={13} /> {usuario?.email ?? '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{ background: `${metaAtual.cor}1f`, border: `1px solid ${metaAtual.cor}44`, color: metaAtual.cor, fontSize: 12.5, fontWeight: 600 }}
                >
                  <metaAtual.Icon size={14} /> {metaAtual.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{metaAtual.descricao}</span>
              </div>
            </>
          ) : (
            /* Formulário de edição */
            <form onSubmit={handleSalvar} className="flex flex-col gap-4">
              <div>
                <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Nome</label>
                <input className="input-glass" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={200} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>E-mail</label>
                <input className="input-glass" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              {/* Seletor de persona */}
              <div>
                <label className="block mb-2" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Tipo de perfil</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERFIS.map((p) => {
                    const sel = perfil === p.valor;
                    return (
                      <button
                        type="button"
                        key={p.valor}
                        onClick={() => setPerfil(p.valor)}
                        aria-pressed={sel}
                        className="relative flex items-start gap-3 rounded-xl p-3 pr-9 text-left transition-all"
                        style={{
                          background: sel ? `${p.cor}1f` : 'var(--bg-input)',
                          border: `1px solid ${sel ? p.cor : 'var(--border-glass)'}`,
                          boxShadow: sel ? `0 0 0 1px ${p.cor}, 0 0 0 4px ${p.cor}26` : 'none',
                          opacity: sel ? 1 : 0.7,
                        }}
                      >
                        {/* Chip do ícone: sólido quando ativo, neutro quando inativo */}
                        <span
                          className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 transition-colors"
                          style={{
                            background: sel ? p.cor : 'var(--bg-glass-hover)',
                            color: sel ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          <p.Icon size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: sel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {p.label}
                          </span>
                          <span className="block" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.descricao}</span>
                        </span>
                        {/* Indicador radio: preenchido com check quando ativo */}
                        <span
                          className="absolute top-3 right-3 w-[18px] h-[18px] rounded-full grid place-items-center transition-all"
                          style={{
                            background: sel ? p.cor : 'transparent',
                            border: `1.5px solid ${sel ? p.cor : 'var(--border-glass-hover)'}`,
                          }}
                        >
                          {sel && <Check size={12} color="#fff" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Troca de senha (opcional) */}
              {!trocarSenha ? (
                <button type="button" onClick={() => setTrocarSenha(true)} className="self-start flex items-center gap-1.5 text-pulsar-400 hover:underline" style={{ fontSize: 13 }}>
                  <Lock size={14} /> Alterar senha
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Alterar senha</span>
                    <button type="button" onClick={() => { setTrocarSenha(false); setSenhaAtual(''); setNovaSenha(''); }} className="text-pulsar-300 hover:text-pulsar-100" aria-label="Cancelar troca de senha">
                      <X size={15} />
                    </button>
                  </div>
                  <input className="input-glass" type={mostrarSenha ? 'text' : 'password'} placeholder="Senha atual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
                  <div className="relative">
                    <input className="input-glass pr-12" type={mostrarSenha ? 'text' : 'password'} placeholder="Nova senha (8+ chars, 2 nº, 1 especial)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setMostrarSenha((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-pulsar-300 hover:text-pulsar-100" tabIndex={-1} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={salvando} className="btn-gradient px-5 py-2.5 min-h-[44px]" style={{ fontSize: 14 }}>
                  {salvando ? 'Salvando…' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditando(false)} className="px-4 py-2.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </GlassCard>

        {/* ── APARÊNCIA ───────────────────────────────────────────────────── */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <SecaoTitulo>Aparência</SecaoTitulo>
          <button type="button" onClick={toggleTheme} className="w-full flex items-center justify-between" aria-pressed={!dark}>
            <span className="flex items-center gap-3">
              {dark ? <Moon size={20} style={{ color: 'var(--text-accent)' }} /> : <Sun size={20} style={{ color: 'var(--text-accent)' }} />}
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{dark ? 'Tema escuro' : 'Tema claro'}</span>
            </span>
            <span className={['theme-switch', dark ? '' : 'on'].join(' ')}>
              <span className="theme-switch-knob" />
            </span>
          </button>
        </GlassCard>

        {/* ── NOTIFICAÇÕES ────────────────────────────────────────────────── */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={15} style={{ color: 'var(--text-secondary)' }} />
            <SecaoTitulo>Notificações</SecaoTitulo>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {notifs.map((n) => (
              <SwitchRow key={n.chave} titulo={n.titulo} descricao={n.descricao} ligado={prefs[n.chave]} onToggle={() => toggle(n.chave)} />
            ))}
          </div>
          <p className="mt-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Preferências salvas neste dispositivo. O envio de notificações chega numa próxima etapa.
          </p>
        </GlassCard>

        {/* ── FAVORITOS ───────────────────────────────────────────────────── */}
        <GlassCard hover={false} padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={15} style={{ color: 'var(--text-secondary)' }} />
            <SecaoTitulo>Regiões favoritas</SecaoTitulo>
          </div>
          {favoritos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Você ainda não favoritou nenhuma região.{' '}
              <Link to="/" className="text-pulsar-400 hover:underline">Explorar o mapa</Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {favoritos.map((f) => (
                <Link
                  key={f.regiaoId}
                  to="/"
                  className="regiao-card flex items-center gap-3"
                  style={{ marginBottom: 0 }}
                >
                  <Star size={15} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{f.regiaoNome}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── CONTA / SAIR ────────────────────────────────────────────────── */}
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
