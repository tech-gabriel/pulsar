import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Mail, ArrowLeft, MailCheck } from 'lucide-react';
import api from '../api/client';
import AuthLayout from '../components/auth/AuthLayout';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.post('/auth/esqueci-senha', { email });
      // Resposta sempre genérica (o backend não revela se o e-mail existe).
      setEnviado(true);
    } catch {
      setErro('Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full"
            style={{ width: 64, height: 64, background: 'rgba(0, 188, 255, 0.12)', color: 'var(--text-accent)' }}
          >
            <MailCheck size={30} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>
            Verifique seu e-mail
          </h1>
          <p className="mt-2.5" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Se houver uma conta associada a <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, enviamos um
            link para redefinir sua senha. O link expira em 60 minutos.
          </p>
          <p className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Não recebeu? Confira a caixa de spam ou{' '}
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="text-[var(--text-accent)] hover:underline font-semibold"
            >
              tente outro e-mail
            </button>
            .
          </p>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 mt-7 text-[var(--text-accent)] hover:underline font-semibold"
            style={{ fontSize: 14 }}
          >
            <ArrowLeft size={16} /> Voltar para o login
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
          Recuperar senha
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Informe seu e-mail e enviaremos um link para criar uma nova senha
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
          <label className="block text-[var(--text-secondary)] mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>
            E-mail
          </label>
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

        <button type="submit" disabled={enviando} className="btn-gradient w-full py-3 mt-1 min-h-[48px]">
          {enviando ? 'Enviando…' : 'Enviar link de recuperação'}
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
