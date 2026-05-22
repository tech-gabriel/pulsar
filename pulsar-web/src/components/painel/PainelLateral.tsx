import { RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react';
import type { RegiaoDto } from '../../types';
import BadgeRisco from '../ui/BadgeRisco';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Props {
  regioes: RegiaoDto[];
  carregando: boolean;
  erro: string | null;
  regiaoSelecionada: string | null;
  onSelecionarRegiao: (nome: string) => void;
  onRecarregar: () => void;
  ultimaAtualizacao: Date | null;
  onLogout: () => void;
  nomeUsuario: string;
}

function formatarHorario(data: Date | null): string {
  if (!data) return 'Nunca';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Ordena regiões: Alto → Moderado → Baixo
const ORDEM_FAIXA: Record<string, number> = { ALTO: 0, MODERADO: 1, BAIXO: 2 };

function ordenarRegioes(regioes: RegiaoDto[]): RegiaoDto[] {
  return [...regioes].sort((a, b) => {
    const oa = ORDEM_FAIXA[a.faixaRisco] ?? 3;
    const ob = ORDEM_FAIXA[b.faixaRisco] ?? 3;
    if (oa !== ob) return oa - ob;
    return b.scoreAgregado - a.scoreAgregado;
  });
}

export default function PainelLateral({
  regioes,
  carregando,
  erro,
  regiaoSelecionada,
  onSelecionarRegiao,
  onRecarregar,
  ultimaAtualizacao,
  onLogout,
  nomeUsuario,
}: Props) {
  const ordenadas = ordenarRegioes(regioes);

  return (
    <aside className="w-80 flex flex-col bg-white border-r border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-pulsar-950 text-white flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            PULSAR
          </h1>
          <p className="text-xs text-pulsar-300 truncate">Olá, {nomeUsuario}</p>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-pulsar-300 hover:text-white transition-colors px-2 py-1 rounded"
        >
          Sair
        </button>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 bg-pulsar-900 text-pulsar-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {erro ? (
            <WifiOff size={12} className="text-red-400" />
          ) : (
            <Wifi size={12} className="text-green-400" />
          )}
          <span>{erro ? 'Sem conexão' : 'Conectado'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} />
          <span>{formatarHorario(ultimaAtualizacao)}</span>
          <button
            onClick={onRecarregar}
            disabled={carregando}
            className="hover:text-white transition-colors disabled:opacity-40"
            title="Atualizar dados"
          >
            <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Lista de regiões */}
      <div className="flex-1 overflow-y-auto">
        {carregando && regioes.length === 0 ? (
          <LoadingSpinner mensagem="Buscando dados..." className="h-40" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ordenadas.map((regiao) => {
              const ativa = regiao.nome === regiaoSelecionada;
              return (
                <li key={regiao.id}>
                  <button
                    onClick={() => onSelecionarRegiao(regiao.nome)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors hover:bg-pulsar-50 ${
                      ativa ? 'bg-pulsar-100 border-l-2 border-pulsar-600' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{regiao.nome}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {regiao.totalSubprefeituras} subprefeituras
                      </p>
                    </div>
                    <BadgeRisco
                      faixa={regiao.faixaRisco}
                      score={regiao.scoreAgregado}
                      size="sm"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 text-center">
        Atualização automática a cada 15 min
      </div>
    </aside>
  );
}
