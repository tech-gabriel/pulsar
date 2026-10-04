import { useContext } from 'react';
import { SubprefeiturasContext, type SubprefeiturasContextValue } from '../contexts/SubprefeiturasContext';

/** Subprefeituras do app logado, vindas do SubprefeiturasProvider (uma busca para o app todo). */
export function useSubprefeituras(): SubprefeiturasContextValue {
  const ctx = useContext(SubprefeiturasContext);
  if (!ctx) throw new Error('useSubprefeituras deve ser usado dentro de SubprefeiturasProvider');
  return ctx;
}
