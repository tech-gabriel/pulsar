import MapaCena, { type CenaId } from './MapaCena';

export interface Cena {
  id: CenaId;
  olho: string;
  titulo: string;
  texto: string;
}

/**
 * As 5 cenas da narrativa da landing, na ordem do scroll. O texto vive aqui
 * (e não no hook de animação) para continuar no HTML prerenderizado.
 */
// react-refresh não consegue tratar como boundary de Fast Refresh — não há
// problema real, o teste importa CENAS diretamente deste arquivo (ver brief).
// eslint-disable-next-line react-refresh/only-export-components
export const CENAS: Cena[] = [
  {
    id: 'acender',
    olho: 'O MAPA',
    titulo: 'São Paulo inteira, em um lugar só',
    texto:
      'As 32 subprefeituras da cidade, monitoradas de forma contínua a partir de fontes oficiais.',
  },
  {
    id: 'risco',
    olho: 'O RISCO',
    titulo: 'O clima muda de bairro para bairro',
    texto:
      'A média da cidade esconde o que importa. Cada região recebe a sua própria leitura, atualizada a cada 15 minutos.',
  },
  {
    id: 'score',
    olho: 'O SCORE',
    titulo: 'Um número que você consegue conferir',
    texto:
      'O Score de Perigo sai de variáveis objetivas, com pesos definidos e abertos. Nada de caixa-preta.',
  },
  {
    id: 'alagamento',
    olho: 'O HISTÓRICO',
    titulo: 'Onde a cidade já alagou',
    texto:
      'Os pontos de alagamento e inundação dos últimos 12 meses, direto dos registros da prefeitura.',
  },
  {
    id: 'alerta',
    olho: 'O AVISO',
    titulo: 'Você sabe antes de sair de casa',
    texto:
      'Quando a sua região entra em risco alto, o alerta chega no seu celular, mesmo com o app fechado.',
  },
];

/**
 * Narrativa do mapa. Este componente é o estado degradado por definição: as
 * cenas empilhadas, todas legíveis, sem nenhuma animação. O `useNarrativaScroll`
 * aplica pin e scrub por cima quando o GSAP carrega, no desktop e sem
 * `prefers-reduced-motion`. Se o GSAP nunca carregar, é isto que fica no ar.
 */
export default function LandingNarrativa() {
  return (
    <section className="landing-narrativa" data-narrativa>
      {CENAS.map((cena) => (
        <article key={cena.id} className="landing-narrativa-cena" data-cena={cena.id}>
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
      ))}
    </section>
  );
}
