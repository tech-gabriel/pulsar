import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pulsar-950 via-pulsar-900 to-pulsar-800 px-4 py-8">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pulsar-500/15 border border-pulsar-400/20 mb-5">
            <Activity size={30} className="text-pulsar-400" />
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PULSAR
          </h1>
          <p className="text-pulsar-300 text-sm mt-1.5">O mapa vivo da sua segurança</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl px-6 py-7 sm:px-7">
          <h2
            className="text-xl font-semibold text-slate-800 mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Entrar na conta
          </h2>

          {erro && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                /* text-base (16px) previne zoom no iOS */
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pulsar-500 focus:border-transparent transition bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pulsar-500 focus:border-transparent transition bg-slate-50 focus:bg-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-pulsar-600 hover:bg-pulsar-700 active:bg-pulsar-800 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base transition-all duration-150 active:scale-[0.98] mt-1 shadow-sm"
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-pulsar-600 hover:text-pulsar-700 font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
