import { CIDADE_ATUAL, type Cidade } from './cidade';
import './cidade.css';

interface Props {
  cidade?: Cidade;
  /** id da área → cor. Áreas sem cor usam o tom neutro. */
  cores?: Record<string, string>;
  /** id da área com contorno escuro (selecionada). */
  destaque?: string;
  className?: string;
}

/** Mapa das áreas da cidade pintadas por valor. Não sabe de onde vêm os dados nem qual é a cidade. */
export default function MapaCoropletico({ cidade = CIDADE_ATUAL, cores = {}, destaque, className }: Props) {
  return (
    <svg className={className ? `mapa-coro ${className}` : 'mapa-coro'} viewBox={cidade.viewBox} aria-hidden="true">
      {cidade.areas.map((a, i) => (
        <path
          key={a.id}
          d={a.d}
          fill={cores[a.id] ?? 'color-mix(in srgb, var(--color-pulsar-300) 35%, var(--bg-primary))'}
          stroke={a.id === destaque ? 'var(--text-primary)' : 'var(--bg-primary)'}
          strokeWidth={a.id === destaque ? 10 : 6}
          strokeLinejoin="round"
          style={{ animationDelay: `${i * 18}ms` }}
        />
      ))}
    </svg>
  );
}
