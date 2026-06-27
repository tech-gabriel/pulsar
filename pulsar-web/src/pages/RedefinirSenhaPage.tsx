import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, XCircle, Check, Lock, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from '../components/auth/AuthLayout';

function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if ((senha.match(/\d/g) ?? []).length < 2) return 'A senha deve conter ao menos 2 números.';
  if (!/[^a-zA-Z0-9]/.test(senha)) return 'A senha deve conter ao menos 1 caractere especial.';
  return null;
}

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const reqs = [
    { label: 'Mínimo 8 caracteres', ok: senha.length >= 8 },
    { label: 'Ao menos 2 números', ok: (senha.match(/\d/g) ?? []).length >= 2 },
    { label: 'Ao menos 1 caractere especial', ok: /[^a-zA-Z0-9]/.test(senha) },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    const erroSenha = validarSenha(senha);
    if (erroSenha) {
      setErro(erroSenha);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha: senha });
      showToast('Senha redefinida com sucesso! Faça login.', 'success');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  // Link aberto sem token (ou adulterado): orienta a solicitar um novo.
  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full"
            style={{ width: 64, height: 64, background: 'rgba(248, 113, 113, 0.12)', color: '#f87171' }}
          >
            <XCircle size={30} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>
            Link inválido
          </h1>
          <p className="mt-2.5" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Este link de recuperação é inválido ou está incompleto. Solicite um novo link para redefinir sua senha.
          </p>
          <Link
            to="/esqueci-senha"
            className="btn-gradient w-full py-3 mt-7 min-h-[48px] inline-flex items-center justify-center"
          >
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* Cabeçalho */}
      <div className="mb-7">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)' }}>
          Criar nova senha
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Escolha uma senha forte para proteger sua conta
        </p>
      </div>

      {erro && (
        <div className="erro-glass mb-5">
          <XCircle size={16} className="flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nova senha */}
        <div>
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Nova senha</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="input-glass !pl-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              tabIndex={-1}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Checklist de requisitos ao vivo */}
          {senha.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {reqs.map((r) => (
                <div key={r.label} className={['req-item', r.ok ? 'ok' : ''].join(' ')}>
                  <Check size={13} className={r.ok ? 'opacity-100' : 'opacity-30'} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmação */}
        <div>
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Confirmar senha</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="input-glass !pl-11"
            />
          </div>
          {confirmacao.length > 0 && senha !== confirmacao && (
            <p className="mt-2" style={{ fontSize: 12.5, color: '#f87171' }}>As senhas não coincidem.</p>
          )}
        </div>

        <button type="submit" disabled={enviando} className="btn-gradient w-full py-3 mt-1 min-h-[48px]">
          {enviando ? 'Redefinindo…' : 'Redefinir senha'}
        </button>
      </form>

      <Link
        to="/login"
        className="inline-flex items-center justify-center gap-2 mt-7 w-full text-[var(--text-accent)] hover:underline font-semibold"
        style={{ fontSize: 13.5 }}
      >
        <ArrowLeft size={16} /> Voltar para o login
      </Link>
    </AuthLayout>
  );
}
