import { useEffect, useRef, type ReactNode } from 'react';
import MapaCoropletico from '../../features/cidade/MapaCoropletico';
import MarcaAnimada from '../ui/MarcaAnimada';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { definirCorDaTela } from '../../utils/barraDoSistema';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';

const TITULO = 'Saiba antes que a água chegue.';
// Topo do painel azul em cada tema (o início do degradê de .auth-vitrine).
const COR_DO_PAINEL = { light: '#0084D1', dark: '#024A70' } as const;
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Layout das telas de autenticação: painel azul da marca, com o mapa de São Paulo em branco e a
 * promessa do produto, ao lado do formulário. No celular o painel vira uma faixa no topo e o
 * formulário sobe por cima dela, como uma folha.
 *
 * Movimento (GSAP, só sem "reduzir movimento"): a frase sobe palavra por palavra, o resto do
 * painel e o formulário entram em cascata, e ondas de luz saem da Sé, como o pulso do símbolo.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isMobile = useIsMobile(1024);

  // No celular o topo da tela é o painel azul: a barra do sistema acompanha.
  useEffect(() => {
    definirCorDaTela(isMobile ? COR_DO_PAINEL[theme] : null);
    return () => definirCorDaTela(null);
  }, [isMobile, theme]);

  useGSAP(() => {
    // Ondas da Sé: círculos no próprio SVG do mapa, centrados na subprefeitura destacada.
    const se = raiz.current?.querySelector<SVGPathElement>('.auth-vitrine-mapa path[fill="var(--color-pulsar-300)"]');
    const svg = se?.ownerSVGElement;
    const aneis: SVGCircleElement[] = [];
    // getBBox não existe fora do navegador (jsdom dos testes): sem ele, sem ondas.
    if (se && svg && typeof se.getBBox === 'function') {
      const caixa = se.getBBox();
      for (let i = 0; i < 3; i++) {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', String(caixa.x + caixa.width / 2));
        c.setAttribute('cy', String(caixa.y + caixa.height / 2));
        c.setAttribute('r', '30');
        c.setAttribute('class', 'auth-anel');
        svg.appendChild(c);
        aneis.push(c);
      }
    }

    const mm = gsap.matchMedia();
    mm.add(COM_MOVIMENTO, () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.auth-vitrine-marca', { autoAlpha: 0, y: -8, duration: 0.5 })
        .from('.auth-palavra > span', { yPercent: 110, duration: 0.8, stagger: 0.05, ease: 'power4.out' }, 0.1)
        .from(['.auth-vitrine-sub', '.auth-vitrine-selo'], { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, 0.45)
        .from('.auth-form-pane > div > *', { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.07 }, 0.15);
      if (aneis.length) {
        gsap.fromTo(aneis, { attr: { r: 30 }, opacity: 0.9 }, {
          attr: { r: 260 }, opacity: 0, duration: 3.6, ease: 'power2.out', repeat: -1, stagger: 1.2, delay: 0.6,
        });
      }
    });
    return () => { mm.revert(); aneis.forEach((c) => c.remove()); };
  }, { scope: raiz });

  return (
    <div ref={raiz} className="auth-bg auth-split">
      <aside className="auth-vitrine">
        <div className="auth-vitrine-marca">
          <MarcaAnimada variante="simbolo-branco" tamanho={36} />
          <span>pulsar</span>
        </div>
        <div className="auth-vitrine-texto">
          <p className="auth-vitrine-titulo" aria-label={TITULO}>
            {TITULO.split(' ').map((p, i) => (
              <span key={i} className="auth-palavra" aria-hidden="true"><span>{p}</span></span>
            ))}
          </p>
          <p className="auth-vitrine-sub">Risco de chuva e alagamento nas 32 subprefeituras de São Paulo, em tempo real.</p>
          <span className="auth-vitrine-selo"><i aria-hidden="true" />Atualizado a cada 15 minutos</span>
        </div>
        {/* O mapa ocupa o espaço que sobra embaixo do texto: nunca passa por trás dele. */}
        <div className="auth-vitrine-area-mapa">
          <MapaCoropletico className="auth-vitrine-mapa" cores={{ se: 'var(--color-pulsar-300)' }} />
        </div>
      </aside>

      <main className="auth-form-pane">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
