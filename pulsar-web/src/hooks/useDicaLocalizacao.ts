import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pulsar-dica-localizacao-vista';

function jaViu(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // localStorage indisponível: não insiste na dica
  }
}

/**
 * Controla a dica sutil do botão "usar minha localização", mostrada só na 1ª
 * visita ao mapa. Mesmo padrão de `useOnboarding`.
 */
export function useDicaLocalizacao() {
  const [mostrarDica, setMostrarDica] = useState<boolean>(() => !jaViu());

  const dispensar = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignora cota/cache indisponível */
    }
    setMostrarDica(false);
  }, []);

  return { mostrarDica, dispensar };
}
