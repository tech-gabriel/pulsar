import { X, Droplets, AlertTriangle } from 'lucide-react';
import type { OcorrenciasProximasDto } from '../../types';

interface Props {
  dados: OcorrenciasProximasDto;
  onFechar: () => void;
}

/**
 * Card compacto ancorado à localização do usuário: quantos alagamentos há por
 * perto (12 meses) + badge de risco elevado quando chove sobre área com
 * histórico. Deixa claro que é histórico recente + condição atual, não previsão.
 */
export default function CardAlagamentoProximo({ dados, onFechar }: Props) {
  const { total, maisProximaMetros, riscoElevado } = dados;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[1200] bottom-[7.5rem] md:bottom-6 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl shadow-xl backdrop-blur-md p-4"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)' }}
      role="status"
    >
      <button
        onClick={onFechar}
        aria-label="Fechar"
        className="absolute top-2 right-2 p-1 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <Droplets size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {total > 0 ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {total} {total === 1 ? 'alagamento registrado' : 'alagamentos registrados'} perto daqui
            </p>
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Nenhum alagamento registrado perto daqui
            </p>
          )}
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {total > 0 && maisProximaMetros != null
              ? `Mais próximo a ${Math.round(maisProximaMetros)} m. Registros dos últimos 12 meses.`
              : 'Nos últimos 12 meses.'}
          </p>

          {riscoElevado && (
            <div
              className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
            >
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span className="text-xs font-medium">
                Risco elevado agora perto de você (chuva sobre área com histórico)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
