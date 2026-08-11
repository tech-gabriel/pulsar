import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '../../hooks/ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../hooks/useTheme';

// O SSG renderiza sempre no tema escuro (não há localStorage no servidor). Se o
// primeiro render do cliente já vier claro, o HTML diverge do pré-renderizado:
// LandingHero e LandingComoFunciona trocam o `src` das imagens pelo tema, e o
// React derruba a árvore inteira com o erro #418, jogando fora o SSG.
function montarEspiao() {
  const renders: Theme[] = [];
  function Espiao() {
    renders.push(useTheme().theme);
    return null;
  }
  render(
    <ThemeProvider>
      <Espiao />
    </ThemeProvider>,
  );
  return renders;
}

describe('ThemeProvider e a hidratação do SSG', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light');
  });

  it('primeiro render é escuro mesmo com tema claro salvo, para bater com o SSG', () => {
    localStorage.setItem('pulsar-theme', 'light');
    const renders = montarEspiao();
    expect(renders[0]).toBe('dark');
  });

  it('adota o tema claro salvo logo depois de montar', async () => {
    localStorage.setItem('pulsar-theme', 'light');
    const renders = montarEspiao();
    await waitFor(() => expect(renders.at(-1)).toBe('light'));
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('não apaga o tema claro salvo ao montar', async () => {
    localStorage.setItem('pulsar-theme', 'light');
    montarEspiao();
    await waitFor(() => expect(localStorage.getItem('pulsar-theme')).toBe('light'));
  });

  it('sem nada salvo, permanece escuro', async () => {
    const renders = montarEspiao();
    expect(renders[0]).toBe('dark');
    await waitFor(() => expect(localStorage.getItem('pulsar-theme')).toBe('dark'));
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
