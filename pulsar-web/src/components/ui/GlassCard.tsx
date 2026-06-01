import type { ReactNode } from 'react';

type Padding = 'sm' | 'md' | 'lg';

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: Padding;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// Padding por tamanho (ETAPA 5.2).
const PADDING: Record<Padding, string> = {
  sm: 'px-3 py-2', // 8px 12px
  md: 'px-4 py-3', // 12px 16px
  lg: 'px-6 py-4', // 16px 24px
};

/**
 * Card glassmorphism reutilizável (ETAPA 5.2). Os estilos de glass ficam em
 * `.glass-card` / `.glass-card-hover` no index.css, usando as variáveis do tema.
 */
export default function GlassCard({
  children,
  className = '',
  hover = true,
  padding = 'md',
  style,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={['glass-card', hover ? 'glass-card-hover' : '', PADDING[padding], className].join(' ')}
      style={style}
    >
      {children}
    </div>
  );
}
