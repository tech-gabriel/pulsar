import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, XCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from '../components/auth/AuthLayout';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login({ email, senha });
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? 'E-mail ou senha incorretos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      {/* Cabeçalho */}
      <div className="mb-7">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)' }}>
          Bem-vindo de volta
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Entre para acompanhar o clima da sua região
        </p>
      </div>

      {erro && (
        <div className="erro-glass mb-5">
          <XCircle size={16} className="flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* E-mail */}
        <div>
          <label className="block text-pulsar-200 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>
            E-mail
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-pulsar-300 pointer-events-none" />
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-pulsar-200" style={{ fontSize: 13, fontWeight: 500 }}>
              Senha
            </label>
            <button
              type="button"
              onClick={() => showToast('Recuperação de senha chega em breve!', 'info')}
              className="text-pulsar-400 hover:underline"
              style={{ fontSize: 12.5 }}
              tabIndex={-1}
            >
              Esqueci minha senha
            </button>
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-pulsar-300 pointer-events-none" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-glass !pl-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-pulsar-300 hover:text-pulsar-100 transition-colors"
              tabIndex={-1}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={enviando} className="btn-gradient w-full py-3 mt-1 min-h-[48px]">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Login social */}
      <div className="mt-6">
        <SocialAuthButtons acao="Entrar" />
      </div>

      <p className="text-center mt-7" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Não tem conta?{' '}
        <Link to="/cadastro" className="text-pulsar-400 hover:underline font-semibold">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  );
}
