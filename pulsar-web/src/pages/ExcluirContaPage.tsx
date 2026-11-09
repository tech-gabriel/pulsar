import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronLeft, House, Loader2, Route, Star } from 'lucide-react';
import Header from '../components/ui/Header';
import { GrupoAjustes, LinhaAjuste } from '../components/configuracoes/GrupoAjustes';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { MotivoSaida } from '../analytics';

const MOTIVOS: { valor: MotivoSaida; rotulo: string }[] = [
  { valor: 'nao_uso', rotulo: 'Não uso mais' },
  { valor: 'avisos_demais', rotulo: 'Recebo avisos demais' },
  { valor: 'sai_de_sp', rotulo: 'Saí de São Paulo' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

const PALAVRA = 'excluir';

/** C1: a própria pessoa exclui a conta. Página própria (e não folha) para ter link direto e o teclado não cobrir o botão. */
export default function ExcluirContaPage() {
  const { excluirConta } = useAuth();
  const { showToast } = useToast();
  const [motivo, setMotivo] = useState<MotivoSaida>();
  const [digitado, setDigitado] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const confirmado = digitado.trim().toLowerCase() === PALAVRA;

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (!confirmado || excluindo) return;
    setExcluindo(true);
    try {
      await excluirConta(PALAVRA, motivo); // sucesso recarrega a landing
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem;
      showToast(msg ?? 'Não foi possível excluir a conta agora. Tente de novo em instantes.', 'error');
      setExcluindo(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 640, paddingTop: 80, paddingBottom: 120 }}>
        <Link to="/app/configuracoes" className="inline-flex items-center gap-0.5 min-h-11 -ml-1.5" style={{ fontSize: 15, color: 'var(--text-accent)' }}>
          <ChevronLeft size={20} aria-hidden="true" /> Configurações
        </Link>
        <h1 className="mb-1.5 mx-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, lineHeight: 1.2, color: 'var(--text-primary)' }}>
          Excluir conta
        </h1>
        <p className="mx-1 mb-6" style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          A exclusão é na hora e não tem volta. Você recebe um e-mail confirmando.
        </p>

        <GrupoAjustes rotulo="O que é apagado">
          <LinhaAjuste Icone={House} titulo="Casa e trabalho" />
          <LinhaAjuste Icone={Star} titulo="Subprefeituras que você acompanha" />
          <LinhaAjuste Icone={Route} titulo="Avisos de rota" />
          <LinhaAjuste Icone={Bell} titulo="Notificações em todos os aparelhos" />
        </GrupoAjustes>

        <form onSubmit={confirmar}>
          <section className="mt-6">
            <h2 id="titulo-motivo" className="mx-4 mb-2 uppercase" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', color: 'var(--text-muted)' }}>
              Por que está saindo? (opcional)
            </h2>
            <div role="group" aria-labelledby="titulo-motivo" className="flex flex-wrap gap-2 mx-1">
              {MOTIVOS.map((m) => {
                const sel = motivo === m.valor;
                return (
                  <button key={m.valor} type="button" aria-pressed={sel} onClick={() => setMotivo(sel ? undefined : m.valor)}
                    className={['min-h-11 px-3.5 rounded-full', sel ? 'bg-pulsar-600 text-white' : ''].join(' ')}
                    style={{ fontSize: 14, fontWeight: sel ? 600 : 400, ...(sel ? {} : { background: 'var(--bg-input)', color: 'var(--text-secondary)', boxShadow: 'inset 0 0 0 1px var(--border-glass)' }) }}>
                    {m.rotulo}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mx-1 mt-6">
            <label htmlFor="confirmar-exclusao" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Para confirmar, digite <strong>{PALAVRA}</strong>
            </label>
            <input id="confirmar-exclusao" className="input-glass" value={digitado} onChange={(e) => setDigitado(e.target.value)}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" />
            <button type="submit" disabled={!confirmado || excluindo}
              className="botao-destrutivo mt-5 w-full min-h-[50px] rounded-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ fontWeight: 700, fontSize: 15 }}>
              {excluindo && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {excluindo ? 'Excluindo…' : 'Excluir minha conta'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
