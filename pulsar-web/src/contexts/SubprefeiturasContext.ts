import { createContext } from 'react';
import type { SubprefeituraMapaDto } from '../types';

export interface SubprefeiturasContextValue {
  subprefeituras: SubprefeituraMapaDto[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  ultimaAtualizacao: Date | null;
}

export const SubprefeiturasContext = createContext<SubprefeiturasContextValue | null>(null);
