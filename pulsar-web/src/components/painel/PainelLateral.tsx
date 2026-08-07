import { Activity, RefreshCw, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import type { RegiaoDto } from '../../types';
import { SkeletonCard } from '../ui/Skeleton';
import { containerStagger, itemStagger } from '../../motion/presets';
import RegiaoCard from './RegiaoCard';

interface Props {
  regioes: RegiaoDto[];
  carregando: boolean;
  erro: string | null;
  regiaoSelecionada: string | null;
  onSelecionarRegiao: (nome: string) => void;
  onRecarregar: () => void;
  ultimaAtualizacao: Date | null;
  nomeUsuario: string;
  isFavorito: (regiaoId: string) => boolean;
  onToggleFavorito: (regiaoId: string) => void;
  hideHeader?: boolean;
}

const ORDEM_FAIXA: Record<string, number> = { ALTO: 0, MODERADO: 1, BAIXO: 2 };

function ordenarRegioes(regioes: RegiaoDto[]): RegiaoDto[] {
  return [...regioes].sort((a, b) => {
    const oa = ORDEM_FAIXA[a.faixaRisco] ?? 3;
    const ob = ORDEM_FAIXA[b.faixaRisco] ?? 3;
    if (oa !== ob) return oa - ob;
    return b.scoreAgregado - a.scoreAgregado;
  });
}

function minutosAtras(data: Date | null): string {
  if (!data) return 'Atualizado agora';
  const min = Math.floor((Date.now() - data.getTime()) / 60000);
  if (min <= 0) return 'Atualizado agora';
  if (min === 1) return 'Atualizado há 1 min';
  return `Atualizado há ${min} min`;
}

export default function PainelLateral({
  regioes,
  carregando,
  erro,
  regiaoSelecionada,
  onSelecionarRegiao,
  onRecarregar,
  ultimaAtualizacao,
  isFavorito,
  onToggleFavorito,
  hideHeader = false,
}: Props) {
  const ordenadas = ordenarRegioes(regioes);
  const favoritas = ordenadas.filter((r) => isFavorito(r.id));
  const demais = ordenadas.filter((r) => !isFavorito(r.id));
  const totalSubs = regioes.reduce((acc, r) => acc + r.totalSubprefeituras, 0);
  const semAlertas = !regioes.some((r) => r.faixaRisco === 'ALTO');

  function renderCard(regiao: RegiaoDto) {
    return (
      <motion.div key={regiao.id} variants={itemStagger}>
        <RegiaoCard
          regiao={regiao}
          ativa={regiao.nome === regiaoSelecionada}
          favorito={isFavorito(regiao.id)}
          onSelecionar={() => onSelecionarRegiao(regiao.nome)}
          onToggleFavorito={() => onToggleFavorito(regiao.id)}
        />
      </motion.div>
    );
  }

  return (
    <div className="painel-glass flex flex-col h-full overflow-hidden">
      {/* Header "Monitoramento" — oculto no drawer mobile (que tem o próprio handle) */}
      {!hideHeader && (
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-pulsar-400 activity-pulse" />
              <h2 className="text-lg font-bold text-pulsar-50" style={{ fontFamily: 'var(--font-heading)' }}>
                Monitoramento
              </h2>
            </div>
          </div>

          <p className="text-xs text-pulsar-300 mt-1">
            {totalSubs} {totalSubs === 1 ? 'subprefeitura' : 'subprefeituras'} • {regioes.length}{' '}
            {regioes.length === 1 ? 'região' : 'regiões'}
          </p>

          <button
            onClick={onRecarregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-pulsar-200 hover:text-white transition-colors mt-1 disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
            {erro ? 'Falha na conexão' : minutosAtras(ultimaAtualizacao)}
          </button>

          {/* Separador gradiente */}
          <div className="painel-separador mt-3" />
        </div>
      )}

      {/* Lista de regiões */}
      <div
        className="painel-scroll flex-1 overflow-y-auto overscroll-contain px-3 pb-4"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {carregando && regioes.length === 0 ? (
          <div className="pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div variants={containerStagger} initial="inicial" animate="animar">
            {semAlertas && (
              <div className="flex items-center gap-2 px-3 py-2.5 mb-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                <Shield size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-200">Tudo tranquilo em São Paulo</span>
              </div>
            )}

            {favoritas.length > 0 && (
              <>
                <p className="px-1 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-yellow-400/90">
                  ★ Favoritas
                </p>
                {favoritas.map(renderCard)}
                {demais.length > 0 && (
                  <p className="px-1 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-pulsar-300/70">
                    Todas as regiões
                  </p>
                )}
              </>
            )}

            {demais.map(renderCard)}
          </motion.div>
        )}
      </div>
    </div>
  );
}
