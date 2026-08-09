import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingHero from '../../components/landing/LandingHero';
import LandingComoFunciona from '../../components/landing/LandingComoFunciona';
import { ThemeContext, type Theme } from '../../hooks/useTheme';

// Regressão: os prints da landing precisam ser servidos de `public/` (URL
// estável começando em `/landing/`). Assets importados de `src/` viram um
// caminho de source cru (`/src/assets/...`) no HTML prerenderizado pelo SSG,
// que dá 404 em produção e quebra a imagem.
function renderComTema(ui: React.ReactNode, theme: Theme) {
  return render(
    <ThemeContext.Provider value={{ theme, toggleTheme: () => {} }}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeContext.Provider>,
  );
}

describe('Imagens da landing (public/, não import de src/)', () => {
  it('hero: mapa vetorial das subprefeituras no lugar do print', () => {
    const { container } = renderComTema(<LandingHero />, 'dark');
    const paths = container.querySelectorAll('path[data-subprefeitura]');
    expect(paths.length).toBeGreaterThan(0);
    expect(container.querySelector('img[src="/landing/mapa.jpg"]')).toBeNull();
  });

  it('como funciona: dashboard escuro/claro em /landing/ conforme o tema', () => {
    renderComTema(<LandingComoFunciona />, 'dark');
    const img = screen.getByRole('img', { name: /painel do pulsar/i });
    expect(img).toHaveAttribute('src', '/landing/dashboard.jpg');
  });

  it('hero: o lockup acompanha o tema (o escuro some no fundo claro)', () => {
    // O SVG do lockup traz a cor dentro dele: o escuro escreve "PULSAR" em
    // #dff2fe, que fica ilegível sobre o fundo claro. Regressão de contraste.
    const escuro = renderComTema(<LandingHero />, 'dark');
    const srcEscuro = escuro.container.querySelector('img[alt="Pulsar"]')?.getAttribute('src');
    escuro.unmount();

    const claro = renderComTema(<LandingHero />, 'light');
    const srcClaro = claro.container.querySelector('img[alt="Pulsar"]')?.getAttribute('src');

    expect(srcEscuro).toBeTruthy();
    expect(srcClaro).toBeTruthy();
    expect(srcClaro).not.toBe(srcEscuro);
  });

  it('nenhuma imagem da landing aponta para caminho de source (/src/assets)', () => {
    renderComTema(<><LandingHero /><LandingComoFunciona /></>, 'dark');
    for (const img of screen.getAllByRole('img')) {
      expect(img.getAttribute('src') ?? '').not.toContain('/src/');
    }
  });
});
