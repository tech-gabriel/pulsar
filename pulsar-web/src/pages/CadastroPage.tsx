import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/ui/GlassCard';

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
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pulsar-500/15 border border-pulsar-400/20 mb-5">
            <Activity size={30} className="text-pulsar-400" />
          </div>
          <h1
            className="text-pulsar-50 tracking-tight text-[24px] sm:text-[28px]"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textShadow: '0 0 30px rgba(0, 188, 255, 0.4)' }}
          >
            PULSAR
          </h1>
          <p className="text-pulsar-300 mt-1.5" style={{ fontSize: 13 }}>O mapa vivo da sua segurança</p>
        </div>

        {/* Card */}
        <GlassCard hover={false} padding="lg" className="!px-5 !py-6 sm:!px-8 sm:!py-8">
          <h2
            className="text-pulsar-50 mb-6"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}
          >
            Criar conta
          </h2>

          {erro && (
            <div className="erro-glass mb-5">
              <XCircle size={16} className="flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-pulsar-200 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                placeholder="Seu nome"
                className="input-glass"
              />
            </div>

            <div>
              <label className="block text-pulsar-200 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="input-glass"
              />
            </div>

            <div>
              <label className="block text-pulsar-200 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="8+ chars, 2 números, 1 especial"
                  className="input-glass pr-12"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-pulsar-300 hover:text-pulsar-100 transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-pulsar-300/70 mt-1.5" style={{ fontSize: 12 }}>
                Mínimo 8 caracteres, 2 números e 1 caractere especial
              </p>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="btn-gradient w-full py-3 mt-1 min-h-[48px]"
            >
              {enviando ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center mt-5" style={{ fontSize: 13 }}>
            <span className="text-pulsar-300">Já tem conta? </span>
            <Link to="/login" className="text-pulsar-400 hover:underline font-semibold">
              Entrar
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
