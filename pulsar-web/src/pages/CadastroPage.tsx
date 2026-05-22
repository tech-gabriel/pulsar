import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if ((senha.match(/\d/g) ?? []).length < 2) return 'A senha deve conter ao menos 2 números.';
  if (!/[^a-zA-Z0-9]/.test(senha)) return 'A senha deve conter ao menos 1 caractere especial.';
  return null;
}

export default function CadastroPage() {
  const navigate = useNavigate();
  const { cadastrar } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
      navigate('/');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pulsar-950 via-pulsar-900 to-pulsar-800 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pulsar-500/20 border border-pulsar-400/30 mb-4">
            <Activity size={28} className="text-pulsar-400" />
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PULSAR
          </h1>
          <p className="text-pulsar-300 text-sm mt-1">O mapa vivo da sua segurança</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2
            className="text-lg font-semibold text-slate-800 mb-5"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Criar conta
          </h2>

          {erro && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                placeholder="Seu nome"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pulsar-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pulsar-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="8+ chars, 2 números, 1 especial"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pulsar-500 focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Mínimo 8 caracteres, 2 números e 1 caractere especial
              </p>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-pulsar-600 hover:bg-pulsar-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors mt-1"
            >
              {enviando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-pulsar-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
