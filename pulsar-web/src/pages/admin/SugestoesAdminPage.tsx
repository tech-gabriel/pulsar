import { useMemo, useState, type FormEvent } from 'react';
import { Lightbulb, Plus, Pencil, Trash2, Check, X, ShieldAlert, EyeOff } from 'lucide-react';
import Header from '../../components/ui/Header';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import BadgeRisco from '../../components/ui/BadgeRisco';
import AdminSubnav from '../../components/admin/AdminSubnav';
import { useAuth } from '../../contexts/AuthContext';
import { useSugestoesAdmin } from '../../hooks/useSugestoesAdmin';
import type { FaixaRisco, SalvarSugestaoRequest, SugestaoAdminDto } from '../../types';

const CATEGORIAS = ['CHUVA', 'VENTO', 'NEBLINA', 'UV', 'GERAL'] as const;
const FAIXAS: FaixaRisco[] = ['BAIXO', 'MODERADO', 'ALTO'];

const FORM_VAZIO: SalvarSugestaoRequest = {
  categoria: 'GERAL', faixaRisco: 'BAIXO', titulo: '', descricao: '', ativa: true,
};

export default function SugestoesAdminPage() {
  const { usuario } = useAuth();
  const { sugestoes, carregando, erro, criar, atualizar, remover, recarregar } = useSugestoesAdmin();
  const podeEditar = usuario?.role === 'ADMIN';

  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [editando, setEditando] = useState<SugestaoAdminDto | 'novo' | null>(null);

  const filtradas = useMemo(
    () => (filtroCategoria === 'TODAS' ? sugestoes : sugestoes.filter((s) => s.categoria === filtroCategoria)),
    [sugestoes, filtroCategoria]
  );

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 900, paddingTop: 80, paddingBottom: 80 }}>
        <AdminSubnav />

        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Lightbulb size={22} style={{ color: 'var(--text-accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
              Sugestões
            </h1>
            {!podeEditar && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: 11.5 }}
              >
                <ShieldAlert size={12} /> Somente leitura
              </span>
            )}
          </div>
          {podeEditar && editando === null && (
            <button type="button" onClick={() => setEditando('novo')} className="btn-gradient flex items-center gap-1.5 px-4 py-2" style={{ fontSize: 13.5 }}>
              <Plus size={16} /> Nova sugestão
            </button>
          )}
        </div>

        {/* Formulário de criação/edição */}
        {editando !== null && (
          <SugestaoForm
            inicial={editando === 'novo' ? FORM_VAZIO : toRequest(editando)}
            titulo={editando === 'novo' ? 'Nova sugestão' : 'Editar sugestão'}
            onCancelar={() => setEditando(null)}
            onSalvar={async (req) => {
              const ok = editando === 'novo'
                ? await criar(req)
                : await atualizar(editando.id, req);
              if (ok) setEditando(null);
            }}
          />
        )}

        {/* Filtro por categoria */}
        <div className="mb-4 flex flex-wrap gap-2">
          {['TODAS', ...CATEGORIAS].map((c) => {
            const ativo = filtroCategoria === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFiltroCategoria(c)}
                className="rounded-full px-3 py-1 transition-colors"
                style={{
                  fontSize: 12.5, fontWeight: 600,
                  background: ativo ? 'var(--bg-glass-hover)' : 'transparent',
                  border: `1px solid ${ativo ? 'var(--text-accent)' : 'var(--border-glass)'}`,
                  color: ativo ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {c === 'TODAS' ? 'Todas' : c}
              </button>
            );
          })}
        </div>

        {carregando ? (
          <div className="py-20 grid place-items-center"><LoadingSpinner /></div>
        ) : erro ? (
          <ErrorBanner mensagem="Não foi possível carregar as sugestões." onRetry={recarregar} />
        ) : filtradas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma sugestão nesta categoria.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtradas.map((s) => (
              <SugestaoCard
                key={s.id}
                s={s}
                podeEditar={podeEditar}
                onEditar={() => setEditando(s)}
                onRemover={() => remover(s.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function toRequest(s: SugestaoAdminDto): SalvarSugestaoRequest {
  return { categoria: s.categoria, faixaRisco: s.faixaRisco, titulo: s.titulo, descricao: s.descricao, ativa: s.ativa };
}

function SugestaoCard({ s, podeEditar, onEditar, onRemover }: {
  s: SugestaoAdminDto;
  podeEditar: boolean;
  onEditar: () => void;
  onRemover: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <GlassCard hover={false} padding="md" style={{ opacity: s.ativa ? 1 : 0.6 }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600 }}>
              {s.categoria}
            </span>
            <BadgeRisco faixa={s.faixaRisco} size="sm" />
            {!s.ativa && (
              <span className="inline-flex items-center gap-1" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                <EyeOff size={12} /> Inativa
              </span>
            )}
          </div>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>{s.titulo}</p>
          <p className="mt-0.5" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.descricao}</p>
        </div>

        {podeEditar && (
          <div className="flex flex-shrink-0 items-center gap-1">
            {confirmando ? (
              <>
                <button type="button" onClick={onRemover} title="Confirmar exclusão" aria-label="Confirmar exclusão" className="p-1.5" style={{ color: '#ef4444' }}>
                  <Check size={16} />
                </button>
                <button type="button" onClick={() => setConfirmando(false)} title="Cancelar" aria-label="Cancelar exclusão" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onEditar} title="Editar" aria-label="Editar sugestão" className="p-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => setConfirmando(true)} title="Excluir" aria-label="Excluir sugestão" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function SugestaoForm({ inicial, titulo, onSalvar, onCancelar }: {
  inicial: SalvarSugestaoRequest;
  titulo: string;
  onSalvar: (req: SalvarSugestaoRequest) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<SalvarSugestaoRequest>(inicial);
  const [salvando, setSalvando] = useState(false);

  function set<K extends keyof SalvarSugestaoRequest>(chave: K, valor: SalvarSugestaoRequest[K]) {
    setForm((f) => ({ ...f, [chave]: valor }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSalvar({ ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim() });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <GlassCard hover={false} padding="lg" className="mb-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>{titulo}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Categoria</label>
            <select className="input-glass" value={form.categoria} onChange={(e) => set('categoria', e.target.value)} aria-label="Categoria">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Faixa de risco</label>
            <select className="input-glass" value={form.faixaRisco} onChange={(e) => set('faixaRisco', e.target.value as FaixaRisco)} aria-label="Faixa de risco">
              {FAIXAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Título</label>
          <input className="input-glass" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} required maxLength={200} />
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Descrição</label>
          <textarea className="input-glass" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required maxLength={1000} rows={3} style={{ resize: 'vertical' }} />
        </div>

        <button type="button" onClick={() => set('ativa', !form.ativa)} aria-pressed={form.ativa} className="flex items-center justify-between gap-3">
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Ativa (visível nas recomendações)</span>
          <span className={['theme-switch', form.ativa ? 'on' : ''].join(' ')}><span className="theme-switch-knob" /></span>
        </button>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={salvando} className="btn-gradient px-5 py-2.5 min-h-[44px]" style={{ fontSize: 14 }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={onCancelar} className="px-4 py-2.5" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
