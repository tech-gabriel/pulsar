import { useState, type FormEvent } from 'react';
import { Check, ChevronRight, Eye, EyeOff, Lock, X } from 'lucide-react';
import { GrupoAjustes } from './GrupoAjustes';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PERFIS, perfilMeta } from '../../utils/perfil';
import type { TipoPerfil } from '../../types';

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

/** Grupo "Conta": a linha com avatar abre, no próprio cartão, a edição de perfil (nome, e-mail, tipo, senha). */
export default function ContaGrupo() {
  const { usuario, atualizarPerfil } = useAuth();
  const { showToast } = useToast();
  const metaAtual = perfilMeta(usuario?.perfil);

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
    // E-mail novo fica pendente até o clique no link (SEC1): o toast precisa dizer isso.
    const trocouEmail = email.trim().toLowerCase() !== (usuario?.email ?? '');
    try {
      await atualizarPerfil({
        nome,
        email,
        perfil,
        ...(trocarSenha ? { senhaAtual, novaSenha } : {}),
      });
      showToast(
        trocouEmail
          ? `Enviamos um link para ${email.trim()}. O e-mail da conta só muda depois que você confirmar.`
          : 'Perfil atualizado com sucesso!',
        'success',
      );
      setEditando(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem;
      showToast(msg ?? 'Não foi possível atualizar o perfil.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  const rodape = usuario?.emailPendente
    ? `Enviamos um link para ${usuario.emailPendente}. Até você confirmar, o e-mail da conta continua sendo ${usuario.email}.`
    : undefined;

  return (
    <GrupoAjustes rotulo="Conta" rodape={rodape}>
      {!editando ? (
        <button type="button" onClick={abrirEdicao} aria-label={`Editar perfil, ${usuario?.nome ?? ''}`}
          className="linha-ajuste flex w-full items-center gap-3 text-left" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <span aria-hidden="true" className="w-11 h-11 rounded-full grid place-items-center flex-shrink-0"
            style={{ background: 'var(--bg-input)', color: 'var(--text-accent)', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>
            {iniciais(usuario?.nome ?? '')}
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="truncate" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{usuario?.nome}</span>
            <span className="truncate" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{usuario?.email} · {metaAtual.label}</span>
          </span>
          <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
        </button>
      ) : (
        <form onSubmit={handleSalvar} className="flex flex-col gap-4 p-4" aria-label="Editar perfil">
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
                    <span
                      className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 transition-colors"
                      style={{ background: sel ? p.cor : 'var(--bg-glass-hover)', color: sel ? '#fff' : 'var(--text-muted)' }}
                    >
                      <p.Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: sel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {p.label}
                      </span>
                      <span className="block" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.descricao}</span>
                    </span>
                    <span
                      className="absolute top-3 right-3 w-[18px] h-[18px] rounded-full grid place-items-center transition-all"
                      style={{ background: sel ? p.cor : 'transparent', border: `1.5px solid ${sel ? p.cor : 'var(--border-glass-hover)'}` }}
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
            <button type="button" onClick={() => setTrocarSenha(true)} className="self-start flex items-center gap-1.5 hover:underline" style={{ fontSize: 13, color: 'var(--text-accent)' }}>
              <Lock size={14} /> Alterar senha
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Alterar senha</span>
                <button type="button" onClick={() => { setTrocarSenha(false); setSenhaAtual(''); setNovaSenha(''); }} className="hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }} aria-label="Cancelar troca de senha">
                  <X size={15} />
                </button>
              </div>
              <input className="input-glass" type={mostrarSenha ? 'text' : 'password'} placeholder="Senha atual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
              <div className="relative">
                <input className="input-glass pr-12" type={mostrarSenha ? 'text' : 'password'} placeholder="Nova senha (8+ chars, 2 nº, 1 especial)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setMostrarSenha((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }} tabIndex={-1} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

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
    </GrupoAjustes>
  );
}
