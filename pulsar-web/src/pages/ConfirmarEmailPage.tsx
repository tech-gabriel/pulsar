import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, XCircle, Loader2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

type Estado = 'confirmando' | 'ok' | 'erro';

// Mesmos círculos de ícone das telas de senha: ciano para "deu certo", vermelho para erro.
const CIRCULO_OK = { background: 'rgba(0, 188, 255, 0.12)', color: 'var(--text-accent)' };
const CIRCULO_ERRO = { background: 'rgba(248, 113, 113, 0.12)', color: '#f87171' };
const CIRCULO_NEUTRO = { background: 'var(--bg-glass)', color: 'var(--text-secondary)' };

function Icone({ estilo, children }: { estilo: React.CSSProperties; children: ReactNode }) {
  return (
    <div className="mx-auto mb-5 flex items-center justify-center rounded-full" style={{ width: 64, height: 64, ...estilo }}>
      {children}
    </div>
  );
}

const titulo = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' } as const;
const texto = { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 } as const;
const botao = 'btn-gradient w-full py-3 mt-7 min-h-[48px] inline-flex items-center justify-center';

export default function ConfirmarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { estaAutenticado, recarregarUsuario } = useAuth();
  const [estado, setEstado] = useState<Estado>('confirmando');
  const [mensagem, setMensagem] = useState<string | null>(null);
  // O link é de uso único e o StrictMode roda o efeito duas vezes: a segunda chamada daria "já usado".
  const jaEnviou = useRef(false);

  useEffect(() => {
    if (!token || jaEnviou.current) return;
    jaEnviou.current = true;
    api.post('/auth/confirmar-email', { token })
      .then(async () => {
        setEstado('ok');
        if (estaAutenticado) await recarregarUsuario().catch(() => {});
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem;
        setMensagem(msg ?? 'Não foi possível confirmar agora. Tente de novo em instantes.');
        setEstado('erro');
      });
  }, [token, estaAutenticado, recarregarUsuario]);

  const destino = estaAutenticado ? '/app' : '/login';
  const rotuloDestino = estaAutenticado ? 'Voltar para o mapa' : 'Entrar';

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <Icone estilo={CIRCULO_ERRO}><XCircle size={30} /></Icone>
          <h1 style={titulo}>Link incompleto</h1>
          <p className="mt-2.5" style={texto}>Abra o link direto do e-mail que enviamos. Se ele não chegou, peça outro pelo aviso no app.</p>
          <Link to={destino} className={botao}>{rotuloDestino}</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center" aria-live="polite">
        {estado === 'confirmando' && (
          <>
            <Icone estilo={CIRCULO_NEUTRO}><Loader2 size={30} className="animate-spin" /></Icone>
            <h1 style={titulo}>Confirmando seu e-mail</h1>
            <p className="mt-2.5" style={texto}>Só um instante.</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <Icone estilo={CIRCULO_OK}><MailCheck size={30} /></Icone>
            <h1 style={titulo}>E-mail confirmado</h1>
            <p className="mt-2.5" style={texto}>Pronto. Se um dia esquecer a senha, o link de recuperação chega só para você.</p>
            <Link to={destino} className={botao}>{rotuloDestino}</Link>
          </>
        )}
        {estado === 'erro' && (
          <>
            <Icone estilo={CIRCULO_ERRO}><XCircle size={30} /></Icone>
            <h1 style={titulo}>Não deu para confirmar</h1>
            <p className="mt-2.5" style={texto}>{mensagem}</p>
            <Link to={destino} className={botao}>{rotuloDestino}</Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
