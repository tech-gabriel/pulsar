import type { FaixaRisco } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';

interface Props {
  faixa: FaixaRisco | null | undefined;
  score?: number | null;
  size?: 'sm' | 'md';
}

export default function BadgeRisco({ faixa, score, size = 'md' }: Props) {
  const cores = coresParaFaixa(faixa);
  const label = labelFaixa(faixa);

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${padding}`}
      style={{ backgroundColor: cores.bg, color: cores.text }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: cores.fill }}
      />
      {label}
      {score != null && (
        <span className="font-mono font-semibold">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}
