import { useState, useCallback } from 'react';

function jaViu(chave: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(chave) === '1';
  } catch {
    return true; // localStorage indisponível: não insiste na dica
  }
}

/**
 * Dica que aparece até a pessoa dispensar ou usar o que ela ensina, e não volta mais. Mesmo
 * padrão da marca local do onboarding (`features/ativacao/passos.ts`).
 */
export function useDicaUnica(chave: string) {
  const [mostrarDica, setMostrarDica] = useState<boolean>(() => !jaViu(chave));

  const dispensar = useCallback(() => {
    try {
      localStorage.setItem(chave, '1');
    } catch {
      /* ignora cota/cache indisponível */
    }
    setMostrarDica(false);
  }, [chave]);

  return { mostrarDica, dispensar };
}

/** A dica sutil do botão "usar minha localização", mostrada só na 1ª visita ao mapa. */
export const useDicaLocalizacao = () => useDicaUnica('pulsar-dica-localizacao-vista');
