import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { ThemeContext, type Theme } from './useTheme';

// Persiste o tema em localStorage, aplica a classe `light` no <html> e atualiza
// a meta theme-color. Default: dark.
//
// A troca usa a View Transitions API para uma revelação circular saindo do
// ponto clicado (efeito premium). Onde a API não existe (ou com
// prefers-reduced-motion), cai num toggle simples e instantâneo.

const STORAGE_KEY = 'pulsar-theme';

function lerTemaInicial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function aplicarClasse(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
}

// No servidor não existe layout para medir e o React avisa se useLayoutEffect
// roda no renderToString do SSG.
const useLayoutEffectIsomorfico = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Começa escuro de propósito, e não lendo o localStorage: o SSG pré-renderiza
  // sempre no escuro, então iniciar no claro fazia o primeiro render do cliente
  // divergir do HTML do servidor. LandingHero e LandingComoFunciona trocam o
  // `src` das imagens pelo tema, e o React abortava a hidratação (erro #418),
  // jogando fora a árvore pré-renderizada inteira.
  const [theme, setTheme] = useState<Theme>('dark');
  const [sincronizado, setSincronizado] = useState(false);

  // Layout effect: a correção entra antes do paint, então quem usa tema claro
  // não vê o logo escuro piscar. As cores em si já vieram certas do
  // theme-init.js, que roda antes do primeiro paint.
  useLayoutEffectIsomorfico(() => {
    setTheme(lerTemaInicial());
    setSincronizado(true);
  }, []);

  useEffect(() => {
    // Antes de sincronizar, o estado ainda é o palpite do servidor: mexer no
    // DOM aqui apagaria a classe que o theme-init.js já aplicou e gravaria
    // 'dark' por cima da preferência salva.
    if (!sincronizado) return;
    aplicarClasse(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#052F4A' : '#F8FAFC');
  }, [theme, sincronizado]);

  const toggleTheme = useCallback((event?: MouseEvent) => {
    const proximo: Theme = lerTemaInicial() === 'light' ? 'dark' : 'light';

    const startViewTransition = (
      document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    ).startViewTransition?.bind(document);

    const reduzMovimento =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback: sem View Transitions ou com movimento reduzido, troca direto.
    if (!startViewTransition || reduzMovimento) {
      setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
      return;
    }

    // Origem da revelação: o ponto clicado (ou o topo direito como padrão).
    const x = event?.clientX ?? window.innerWidth - 40;
    const y = event?.clientY ?? 40;
    const raioFinal = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transicao = startViewTransition(() => {
      // Atualiza o DOM sincronamente para o snapshot "novo" da transição já
      // refletir o tema; o setState mantém o React em sincronia (o efeito
      // reaplica a mesma classe de forma idempotente).
      aplicarClasse(proximo);
      setTheme(proximo);
    });

    transicao.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${raioFinal}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
