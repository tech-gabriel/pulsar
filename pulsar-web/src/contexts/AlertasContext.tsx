import { createContext, useContext } from 'react';
import type { RegiaoDto } from '../types';

export interface AlertasContextValue {
  /** Todas as regiões (dado bruto da última coleta). */
  regioes: RegiaoDto[];
  /** Regiões atualmente em risco ALTO — os "alertas" exibidos no sino. */
  alertas: RegiaoDto[];
  carregando: boolean;
  recarregar: () => void;
}

export const AlertasContext = createContext<AlertasContextValue | null>(null);

export function useAlertas(): AlertasContextValue {
  const ctx = useContext(AlertasContext);
  if (!ctx) throw new Error('useAlertas deve ser usado dentro de AlertasProvider');
  return ctx;
}
