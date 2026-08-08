import MapaCena from './MapaCena';
import { CENAS } from '../../data/landing-narrativa';

/**
 * Narrativa do mapa. Este componente é o estado degradado por definição: as
 * cenas empilhadas, todas legíveis, sem nenhuma animação. O `useNarrativaScroll`
 * aplica pin e scrub por cima quando o GSAP carrega, no desktop e sem
 * `prefers-reduced-motion`. Se o GSAP nunca carregar, é isto que fica no ar.
 */
export default function LandingNarrativa() {
  return (
    <section className="landing-narrativa" data-narrativa>
      {CENAS.map((cena) => {
        const tituloId = `landing-narrativa-titulo-${cena.id}`;
        return (
          <article
            key={cena.id}
            className="landing-narrativa-cena"
            data-cena={cena.id}
            aria-labelledby={tituloId}
          >
            <div className="landing-narrativa-mapa">
              <MapaCena cena={cena.id} />
            </div>

            <div className="landing-narrativa-texto">
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
            </div>
          </article>
        );
      })}
    </section>
  );
}
