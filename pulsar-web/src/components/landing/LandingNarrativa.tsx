import { useRef } from 'react';
import MapaCena from './MapaCena';
import { CENAS } from '../../data/landing-narrativa';
import { useCenaAtiva } from '../../hooks/useCenaAtiva';

/**
 * Narrativa do mapa: uma instância de `MapaCena` fica sticky numa coluna e os
 * 5 textos rolam na outra, em fluxo normal.
 *
 * Nada aqui sequestra o scroll. Não há pin, não há altura falsa, e rolar
 * rápido atravessa a seção como em qualquer outra página. Foi a lição das duas
 * tentativas anteriores: tanto o crossfade vertical quanto o trilho horizontal
 * prendiam a tela, e era isso que incomodava, não a direção do movimento.
 *
 * O estado degradado é o mesmo componente sem JS: `useCenaAtiva` devolve a
 * primeira cena, os 5 textos estão no DOM (requisito de SEO) e o sticky
 * funciona, porque é CSS puro.
 */
export default function LandingNarrativa() {
  const ref = useRef<HTMLElement | null>(null);
  const { cenaAtiva, vista } = useCenaAtiva(ref, CENAS[0].id);

  return (
    <section
      ref={ref}
      className="landing-narrativa"
      data-narrativa
      data-vista={vista ? 'true' : undefined}
    >
      <div className="landing-narrativa-mapa" data-mapa-cena={cenaAtiva}>
        <MapaCena cena={cenaAtiva} />
      </div>

      <div className="landing-narrativa-textos">
        {CENAS.map((cena) => {
          const tituloId = `landing-narrativa-titulo-${cena.id}`;
          return (
            <article
              key={cena.id}
              className="landing-narrativa-cena"
              data-cena={cena.id}
              aria-labelledby={tituloId}
            >
              {/* Mesmo tratamento dos eyebrows das outras seções da landing
                  (ver LandingProblema.tsx): classes Tailwind + --text-accent. */}
              <p
                className="uppercase tracking-[0.18em] text-xs font-semibold"
                style={{ color: 'var(--text-accent)' }}
              >
                {cena.olho}
              </p>
              <h2
                id={tituloId}
                className="mt-3"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 'clamp(26px, 3.2vw, 40px)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.15,
                }}
              >
                {cena.titulo}
              </h2>
              <p
                className="mt-4 max-w-md"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
              >
                {cena.texto}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
