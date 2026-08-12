import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '../../hooks/ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../hooks/useTheme';

// O SSG renderiza sempre no tema claro (não há localStorage no servidor, e o
// padrão do site é claro). Se o primeiro render do cliente já vier escuro, o
// HTML diverge do pré-renderizado: LandingHero e LandingComoFunciona trocam o
// `src` das imagens pelo tema, e o React derruba a árvore inteira com o erro
// #418, jogando fora o SSG.
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
    // Espelha o HTML servido: o index.html sai com class="light" no <html>.
    document.documentElement.classList.add('light');
  });

  it('primeiro render é claro mesmo com tema escuro salvo, para bater com o SSG', () => {
    localStorage.setItem('pulsar-theme-v2', 'dark');
    const renders = montarEspiao();
    expect(renders[0]).toBe('light');
  });

  it('adota o tema escuro salvo logo depois de montar', async () => {
    localStorage.setItem('pulsar-theme-v2', 'dark');
    const renders = montarEspiao();
    await waitFor(() => expect(renders.at(-1)).toBe('dark'));
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('não apaga o tema escuro salvo ao montar', async () => {
    localStorage.setItem('pulsar-theme-v2', 'dark');
    montarEspiao();
    await waitFor(() => expect(localStorage.getItem('pulsar-theme-v2')).toBe('dark'));
  });

  it('sem nada salvo, permanece claro', async () => {
    const renders = montarEspiao();
    expect(renders[0]).toBe('light');
    await waitFor(() => expect(localStorage.getItem('pulsar-theme-v2')).toBe('light'));
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  // A virada do padrão precisa alcançar quem já visitou o site. Como o provider
  // gravava o tema em todo mount, a base inteira tem 'dark' na chave antiga sem
  // nunca ter escolhido. A chave nova zera todo mundo, e o rastro é apagado.
  it('ignora o valor da chave antiga e limpa o rastro', async () => {
    localStorage.setItem('pulsar-theme', 'dark');
    const renders = montarEspiao();
    await waitFor(() => expect(renders.at(-1)).toBe('light'));
    expect(localStorage.getItem('pulsar-theme')).toBeNull();
  });
});
