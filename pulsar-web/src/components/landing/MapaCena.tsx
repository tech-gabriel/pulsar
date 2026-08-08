import { AlertTriangle } from 'lucide-react';
import { SUBPREFEITURAS, VIEWBOX } from './mapaPaths';
import { PALETA, comAlfa } from '../../utils/paleta';

export type CenaId = 'acender' | 'risco' | 'score' | 'alagamento' | 'alerta';

/** Subprefeitura que a narrativa foca a partir da cena 3. */
const FOCO_ID = 'se';
const SCORE_FOCO = 72;

/**
 * Faixa de risco ilustrativa por subprefeitura. Determinística (não aleatória)
 * para o mapa não piscar cores diferentes a cada render e para o teste poder
 * afirmar sobre ela. Distribui as faixas de forma plausível, sem dizer que é
 * leitura real: a landing é ilustrativa, o dado ao vivo está no app.
 */
function faixaDe(indice: number): 'baixo' | 'moderado' | 'alto' {
  const r = indice % 7;
  if (r === 0 || r === 3) return 'moderado';
  if (r === 5) return 'alto';
  return 'baixo';
}

const COR_FAIXA: Record<'baixo' | 'moderado' | 'alto', string> = {
  baixo: PALETA.verde,
  moderado: PALETA.amarelo,
  alto: PALETA.vermelho,
};

/** Pontos de alagamento ilustrativos, em coordenadas do viewBox. */
const PONTOS_ALAGAMENTO = [
  { cx: 512, cy: 543 },
  { cx: 548, cy: 505 },
  { cx: 470, cy: 578 },
  { cx: 559, cy: 590 },
  { cx: 497, cy: 470 },
];

interface Props {
  cena: CenaId;
  className?: string;
}

/**
 * Mapa vetorial de São Paulo nos 5 estados da narrativa da landing. Puramente
 * declarativo: quem controla a cena é o `LandingNarrativa`. O SVG é decorativo
 * (`aria-hidden`), porque a informação vive no texto de cada cena; o único
 * conteúdo anunciado é o alerta da cena 5.
 */
export default function MapaCena({ cena, className }: Props) {
  const mostraRisco = cena !== 'acender';
  const mostraFoco = cena === 'score' || cena === 'alagamento' || cena === 'alerta';
  const mostraAlagamento = cena === 'alagamento' || cena === 'alerta';

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg viewBox={VIEWBOX} aria-hidden="true" className="w-full h-auto">
        {SUBPREFEITURAS.map((s, i) => {
          const faixa = faixaDe(i);
          const emFoco = mostraFoco && s.id === FOCO_ID;
          const cor = mostraRisco ? COR_FAIXA[faixa] : PALETA.neutro;
          // Fora de foco o mapa recua para o número em foco poder brilhar.
          const alfa = mostraFoco && !emFoco ? 0.16 : mostraRisco ? 0.55 : 0.1;

          return (
            <path
              key={s.id}
              d={s.d}
              data-subprefeitura={s.id}
              data-risco={mostraRisco ? faixa : undefined}
              data-foco={emFoco ? 'true' : undefined}
              fill={comAlfa(cor, alfa)}
              stroke={comAlfa(cor, emFoco ? 1 : 0.4)}
              strokeWidth={emFoco ? 3 : 1}
            >
              <title>{s.nome}</title>
            </path>
          );
        })}

        {mostraAlagamento &&
          PONTOS_ALAGAMENTO.map((p) => (
            <circle
              key={`${p.cx}-${p.cy}`}
              cx={p.cx}
              cy={p.cy}
              r={9}
              data-alagamento="true"
              fill={comAlfa(PALETA.azul, 0.9)}
              stroke={comAlfa(PALETA.azulProfundo, 1)}
              strokeWidth={2}
            />
          ))}
      </svg>

      {cena === 'score' && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="text-6xl font-bold"
            style={{ color: PALETA.amarelo, fontFamily: 'var(--font-heading)' }}
          >
            {SCORE_FOCO}
          </span>
        </div>
      )}

      {cena === 'alerta' && (
        <div
          role="status"
          className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{
            background: comAlfa(PALETA.vermelho, 0.16),
            color: 'var(--cor-alerta)',
            border: `1px solid ${comAlfa(PALETA.vermelho, 0.5)}`,
          }}
        >
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium">Risco alto na sua região</span>
        </div>
      )}
    </div>
  );
}
