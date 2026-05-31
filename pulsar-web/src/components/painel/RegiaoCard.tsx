import { AlertTriangle } from 'lucide-react';
import type { RegiaoDto } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import BotaoFavorito from './BotaoFavorito';

interface Props {
  regiao: RegiaoDto;
  ativa: boolean;
  favorito: boolean;
  onSelecionar: () => void;
  onToggleFavorito: () => void;
}

/** Card glassmorphism de uma região na lista do painel (ETAPA 4.2). */
export default function RegiaoCard({ regiao, ativa, favorito, onSelecionar, onToggleFavorito }: Props) {
  const cores = coresParaFaixa(regiao.faixaRisco);
  const alto = regiao.scoreAgregado > 60;

  return (
    <button
      type="button"
      onClick={onSelecionar}
      className={['regiao-card w-full text-left', ativa ? 'regiao-card-ativa' : ''].join(' ')}
      style={alto ? { borderLeft: '3px solid #ef4444' } : undefined}
    >
      {/* Linha 1: nome + favorito */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate text-pulsar-50"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}
        >
          {regiao.nome}
        </span>
        <BotaoFavorito ativo={favorito} onToggle={onToggleFavorito} size={16} />
      </div>

      {/* Linha 2: score pill + faixa + contagem */}
      <div className="flex items-center gap-2 mt-2">
        <span
          className="inline-flex items-center justify-center rounded-full text-white"
          style={{
            background: cores.fill,
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
            boxShadow: `0 0 10px ${cores.fill}66`,
          }}
        >
          {regiao.scoreAgregado.toFixed(0)}
        </span>
        <span className="text-xs font-medium" style={{ color: cores.fill }}>
          {labelFaixa(regiao.faixaRisco)}
        </span>
        <span className="ml-auto text-xs text-pulsar-300">
          {regiao.totalSubprefeituras} subprefeituras
        </span>
      </div>

      {/* Linha 3: aviso resumido quando risco alto */}
      {alto && (
        <div className="flex items-center gap-1.5 mt-2 text-pulsar-200" style={{ fontSize: 12 }}>
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <span className="truncate">Condições severas — confira as recomendações.</span>
        </div>
      )}
    </button>
  );
}
