import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface Props {
  Icon: LucideIcon;
  label: string;
  valor: number;
  /** Casas decimais exibidas (0 por padrão). */
  decimais?: number;
  /** Unidade/sufixo logo após o número (ex.: "°C", "/ 32"). */
  sufixo?: string;
  /** Texto auxiliar abaixo do valor. */
  detalhe?: string;
  /** Cor de destaque em hex (usada no ícone e no tint do fundo). */
  cor?: string;
}

/** Cartão de métrica do Dashboard com número animado (count-up). */
export default function KpiCard({
  Icon,
  label,
  valor,
  decimais = 0,
  sufixo = '',
  detalhe,
  cor = '#00BCFF',
}: Props) {
  const animado = useCountUp(valor);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="leading-tight" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
          style={{ background: `${cor}1f`, border: `1px solid ${cor}33` }}
        >
          <Icon size={18} style={{ color: cor }} />
        </div>
      </div>

      <div className="leading-none">
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 28, color: 'var(--text-primary)' }}>
          {animado.toFixed(decimais)}
        </span>
        {sufixo && (
          <span className="ml-1" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {sufixo}
          </span>
        )}
      </div>

      {detalhe && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detalhe}</span>
      )}
    </div>
  );
}
