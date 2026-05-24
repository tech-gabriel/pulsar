import { useNavigate } from 'react-router-dom';
import {
  X, Star, StarOff, CloudRain, Wind, Eye, Sun, History, ArrowLeft, RefreshCw,
} from 'lucide-react';
import type { SubprefeituraDto } from '../../types';
import { useRegiaoDetalhe } from '../../hooks/useRegiaoDetalhe';
import { coresParaFaixa } from '../../utils/risco';
import BadgeRisco from '../ui/BadgeRisco';
import { SkeletonCardSubprefeitura } from '../ui/Skeleton';

interface Props {
  regiaoId: string;
  onFechar: () => void;
  isFavorito: boolean;
  onToggleFavorito: () => void;
}

function BarraScore({ valor, faixa }: { valor: number; faixa: string }) {
  const cores = coresParaFaixa(faixa as never);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(valor, 100)}%`, backgroundColor: cores.fill }}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold w-10 text-right"
        style={{ color: cores.text }}
      >
        {valor.toFixed(1)}
      </span>
    </div>
  );
}

function ItemClima({
  icon: Icon,
  label,
  valor,
  unidade,
}: {
  icon: React.ElementType;
  label: string;
  valor: number;
  unidade: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-medium text-slate-700">{valor.toFixed(1)}</span>
      <span className="text-slate-400">{unidade}</span>
    </div>
  );
}

function CardSubprefeitura({ sub, onVerHistorico }: {
  sub: SubprefeituraDto;
  onVerHistorico: () => void;
}) {
  const score = sub.scoreAtual?.valor ?? 0;
  const faixa = sub.faixaRisco;
  const leitura = sub.ultimaLeitura;

  return (
    <div className="px-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-slate-800 leading-tight">{sub.nome}</p>
        <BadgeRisco faixa={faixa} size="sm" />
      </div>

      <BarraScore valor={score} faixa={faixa} />

      {leitura && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          <ItemClima icon={CloudRain} label="Chuva" valor={leitura.chuvaMmH} unidade="mm/h" />
          <ItemClima icon={Wind} label="Vento" valor={leitura.ventoKmH} unidade="km/h" />
          <ItemClima icon={Eye} label="Visib." valor={leitura.visibilidadeKm} unidade="km" />
          <ItemClima icon={Sun} label="UV" valor={leitura.indiceUv} unidade="" />
        </div>
      )}

      {!leitura && (
        <p className="text-xs text-slate-400 mt-1">Dados não disponíveis para esta zona</p>
      )}

      <button
        onClick={onVerHistorico}
        className="mt-2 flex items-center gap-1.5 text-xs text-pulsar-600 hover:text-pulsar-800 font-medium transition-colors"
      >
        <History size={12} />
        Ver histórico (24h)
      </button>
    </div>
  );
}

export default function DetalheRegiao({ regiaoId, onFechar, isFavorito, onToggleFavorito }: Props) {
  const navigate = useNavigate();
  const { regiao, carregando, erro } = useRegiaoDetalhe(regiaoId);

  return (
    <div className="flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 bg-pulsar-950 text-white">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={onFechar}
            className="text-pulsar-300 hover:text-white transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="flex-1 text-base font-bold truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            {regiao?.nome ?? 'Carregando...'}
          </h2>
          <button
            onClick={onToggleFavorito}
            className="text-pulsar-300 hover:text-yellow-400 transition-colors"
            title={isFavorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            {isFavorito ? <Star size={18} className="fill-yellow-400 text-yellow-400" /> : <StarOff size={18} />}
          </button>
          <button
            onClick={onFechar}
            className="text-pulsar-300 hover:text-white transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Score destaque */}
      {regiao && (
        <div
          className="px-4 py-4 flex items-center gap-4"
          style={{ backgroundColor: coresParaFaixa(regiao.faixaRisco).bg }}
        >
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Score agregado</p>
            <p
              className="text-4xl font-bold leading-none"
              style={{
                fontFamily: 'var(--font-mono)',
                color: coresParaFaixa(regiao.faixaRisco).text,
              }}
            >
              {regiao.scoreAgregado.toFixed(1)}
            </p>
          </div>
          <div>
            <BadgeRisco faixa={regiao.faixaRisco} size="md" />
            <p className="text-xs text-slate-500 mt-1">
              {regiao.totalSubprefeituras} subprefeituras ativas
            </p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {carregando && (
          <>
            <SkeletonCardSubprefeitura />
            <SkeletonCardSubprefeitura />
            <SkeletonCardSubprefeitura />
          </>
        )}

        {!carregando && erro && (
          <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
            <RefreshCw size={24} className="text-slate-300" />
            <p className="text-sm text-slate-500">{erro}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-pulsar-600 hover:underline font-medium"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {regiao && regiao.subprefeituras.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Dados não disponíveis para esta zona
          </div>
        )}

        {regiao?.subprefeituras.map((sub) => (
          <CardSubprefeitura
            key={sub.id}
            sub={sub}
            onVerHistorico={() => navigate(`/historico/${sub.id}`, { state: { regiaoNome: regiao.nome, subNome: sub.nome } })}
          />
        ))}
      </div>
    </div>
  );
}
