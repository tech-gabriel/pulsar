import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './useTheme';

// Persiste o tema em localStorage, aplica a classe `light` no <html> e atualiza
// a meta theme-color. Default: dark.

const STORAGE_KEY = 'pulsar-theme';

function lerTemaInicial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(lerTemaInicial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#052F4A' : '#F8FAFC');
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
