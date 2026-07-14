import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, XCircle, Check, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDestinoPosAuth } from '../hooks/useDestinoPosAuth';
import AuthLayout from '../components/auth/AuthLayout';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if ((senha.match(/\d/g) ?? []).length < 2) return 'A senha deve conter ao menos 2 números.';
  if (!/[^a-zA-Z0-9]/.test(senha)) return 'A senha deve conter ao menos 1 caractere especial.';
  return null;
}

export default function CadastroPage() {
  const navigate = useNavigate();
  const { cadastrar } = useAuth();
  const destino = useDestinoPosAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Requisitos avaliados ao vivo para feedback imediato (UX).
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

    setEnviando(true);
    try {
      await cadastrar({ nome, email, senha });
      navigate(destino);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (status?.status === 409) {
        setErro('Este e-mail já está em uso.');
      } else {
        setErro(status?.data?.message ?? 'Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      {/* Cabeçalho */}
      <div className="mb-7">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)' }}>
          Criar sua conta
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Crie sua conta e acompanhe o clima da sua região de pertinho.
        </p>
      </div>

      {erro && (
        <div className="erro-glass mb-5">
          <XCircle size={16} className="flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nome */}
        <div>
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Nome</label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome"
              className="input-glass !pl-11"
            />
          </div>
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>E-mail</label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="input-glass !pl-11"
            />
          </div>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Senha</label>
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

        <button type="submit" disabled={enviando} className="btn-gradient w-full py-3 mt-1 min-h-[48px]">
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className="text-center" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Ao criar sua conta, você concorda com os{' '}
          <Link to="/termos" target="_blank" className="text-[var(--text-accent)] hover:underline">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacidade" target="_blank" className="text-[var(--text-accent)] hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </form>

      {/* Cadastro social */}
      <div className="mt-6">
        <SocialAuthButtons acao="Cadastrar" />
      </div>

      <p className="text-center mt-7" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Já tem conta?{' '}
        <Link to="/login" className="text-[var(--text-accent)] hover:underline font-semibold">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
