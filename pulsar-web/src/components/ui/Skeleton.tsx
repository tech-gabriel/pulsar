interface SkeletonProps {
  className?: string;
}

// Bloco base com pulse dark (ETAPA 5.6). Mantém `animate-pulse` por compat. de testes.
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded bg-pulsar-800/30 ${className}`} />
  );
}

export function SkeletonCardSubprefeitura() {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full mb-2" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonRegioesLista() {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Card de skeleton glass para listas de cards (ETAPA 5.6). */
export function SkeletonCard() {
  return (
    <div className="glass-card px-4 py-3 mb-2">
      <div className="flex items-center justify-between mb-2.5">
        <div className="skeleton-block h-4 w-32" />
        <div className="skeleton-block h-4 w-4 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <div className="skeleton-block h-6 w-12 rounded-full" />
        <div className="skeleton-block h-3 w-20" />
      </div>
    </div>
  );
}
