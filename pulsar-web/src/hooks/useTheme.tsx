import { createContext, useContext } from 'react';

// Sistema de temas (ETAPA B.2): contexto + hook. O provider vive em
// ThemeProvider.tsx (separado para o Fast Refresh funcionar neste arquivo).

export type Theme = 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
