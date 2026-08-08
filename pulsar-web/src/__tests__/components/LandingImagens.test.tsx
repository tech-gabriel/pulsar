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

  it('nenhuma imagem da landing aponta para caminho de source (/src/assets)', () => {
    renderComTema(<><LandingHero /><LandingComoFunciona /></>, 'dark');
    for (const img of screen.getAllByRole('img')) {
      expect(img.getAttribute('src') ?? '').not.toContain('/src/');
    }
  });
});
