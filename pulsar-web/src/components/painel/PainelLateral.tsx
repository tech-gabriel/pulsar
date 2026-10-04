import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ChevronLeft, ChevronRight, RefreshCw, Search, Star } from 'lucide-react';
import { SkeletonCard } from '../ui/Skeleton';
import { containerStagger, itemStagger } from '../../motion/presets';
import CidadeAgora from '../../features/cidade/CidadeAgora';
import LinhaArea from '../../features/cidade/LinhaArea';
import { CIDADE_ATUAL } from '../../features/cidade/cidade';
import { buscarAreas, emAtencao, ordenarPorRisco, resumoCidade, type Area } from '../../features/cidade/areas';

interface Props {
  areas: Area[];
  /** Áreas que a pessoa acompanha, já com o risco atual. */
  favoritas: Area[];
  carregando: boolean;
  erro: string | null;
  ultimaAtualizacao: Date | null;
  onRecarregar: () => void;
  onSelecionar: (area: Area) => void;
  hideHeader?: boolean;
}

function minutosAtras(data: Date | null): string {
  if (!data) return 'Atualizado agora';
  const min = Math.floor((Date.now() - data.getTime()) / 60000);
  if (min <= 0) return 'Atualizado agora';
  if (min === 1) return 'Atualizado há 1 min';
  return `Atualizado há ${min} min`;
}

function Secao({ children, estrela = false }: { children: React.ReactNode; estrela?: boolean }) {
  return (
    <p className="px-1 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: estrela ? '#CA8A04' : 'var(--text-muted)' }}>
      {estrela && <Star size={12} fill="#FACC15" stroke="#EAB308" aria-hidden="true" />}
      {children}
    </p>
  );
}

/**
 * Painel B (SP3): "{Cidade} agora", suas subprefeituras, o que pede atenção e todas a um
 * toque. Substitui a lista de zonas.
 */
export default function PainelLateral({
  areas, favoritas, carregando, erro, ultimaAtualizacao, onRecarregar, onSelecionar, hideHeader = false,
}: Props) {
  const [verTodas, setVerTodas] = useState(false);
  const [busca, setBusca] = useState('');
  const resumo = useMemo(() => resumoCidade(areas), [areas]);
  const atencao = useMemo(() => emAtencao(areas), [areas]);
  const todas = useMemo(() => (busca.trim() ? buscarAreas(busca, areas) : ordenarPorRisco(areas)), [areas, busca]);

  const linhas = (lista: Area[]) => lista.map((a) => (
    <motion.div key={a.id} variants={itemStagger}><LinhaArea area={a} onClick={() => onSelecionar(a)} /></motion.div>
  ));

  return (
    <div className="painel-glass flex flex-col h-full overflow-hidden">
      {!hideHeader && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-pulsar-400 activity-pulse" />
            <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>Monitoramento</h1>
          </div>
          <button type="button" onClick={onRecarregar} disabled={carregando} title="Atualizar dados"
            className="flex items-center gap-1.5 text-xs min-h-11 disabled:opacity-50" style={{ color: 'var(--text-secondary)' }}>
            <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
            {erro ? 'Falha na conexão' : minutosAtras(ultimaAtualizacao)}
          </button>
        </div>
      )}
      {hideHeader && erro && (
        <button type="button" onClick={onRecarregar} className="mx-4 mb-1 text-xs min-h-11 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <RefreshCw size={12} /> Falha na conexão
        </button>
      )}

      <div className="painel-scroll flex-1 overflow-y-auto overscroll-contain px-3 pb-4" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {carregando && areas.length === 0 ? (
          <div className="pt-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : verTodas ? (
          <motion.div variants={containerStagger} initial="inicial" animate="animar">
            <div className="flex items-center gap-1 pt-1 pb-2">
              <button type="button" onClick={() => { setVerTodas(false); setBusca(''); }} aria-label="Voltar"
                className="w-11 h-11 flex items-center justify-center rounded-xl" style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {areas.length} subprefeituras
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{CIDADE_ATUAL.nome} · pior risco primeiro</p>
              </div>
            </div>
            <label className="flex items-center gap-2 px-3 mb-2 rounded-xl min-h-11" style={{ background: 'var(--bg-input)' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar subprefeitura"
                aria-label="Buscar subprefeitura" className="flex-1 bg-transparent outline-none text-sm min-h-11" style={{ color: 'var(--text-primary)' }} />
            </label>
            {todas.length === 0
              ? <p className="px-2 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma subprefeitura com esse nome.</p>
              : linhas(todas)}
          </motion.div>
        ) : (
          <motion.div variants={containerStagger} initial="inicial" animate="animar">
            <motion.div variants={itemStagger} className="pt-1"><CidadeAgora resumo={resumo} cidadeNome={CIDADE_ATUAL.nome} /></motion.div>
            {favoritas.length > 0 && (<><Secao estrela>Suas subprefeituras</Secao>{linhas(favoritas)}</>)}
            {atencao.length > 0 && (<><Secao>Em atenção agora</Secao>{linhas(atencao)}</>)}
            {areas.length > 0 && (
              <motion.button variants={itemStagger} type="button" onClick={() => setVerTodas(true)}
                className="w-full min-h-11 mt-1 flex items-center justify-center gap-1 text-sm font-semibold" style={{ color: 'var(--text-accent)' }}>
                {`Ver as ${areas.length} subprefeituras`} <ChevronRight size={15} aria-hidden="true" />
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
