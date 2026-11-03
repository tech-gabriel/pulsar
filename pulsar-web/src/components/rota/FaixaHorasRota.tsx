import type { HoraRota } from '../../features/rota/tipos';
import { rotuloHora } from '../../features/rota/textos';
import type { FaixaRisco } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';

const MAX_HORAS = 6;
// A altura da barrinha também diz o risco, para não depender só da cor.
const ALTURA: Record<FaixaRisco, number> = { BAIXO: 3, MODERADO: 5, ALTO: 7 };

/** Pior faixa do caminho hora a hora: a primeira é "Agora", as outras levam a hora cheia. */
export default function FaixaHorasRota({ horas }: { horas: HoraRota[] }) {
  return (
    <ul aria-label="Risco nas próximas horas" className="flex gap-1.5 mt-3 list-none p-0">
      {horas.slice(0, MAX_HORAS).map((h, i) => (
        <li key={h.inicioUtc} className="flex-1 min-w-0 text-center rounded-[10px] py-1.5"
          style={{ background: 'var(--bg-input)', fontSize: 12, color: 'var(--text-secondary)' }}>
          {i === 0 ? 'Agora' : rotuloHora(h.inicioUtc)}
          {/* Caixa de 7 px com a barra no pé: os rótulos ficam alinhados qualquer que seja a altura. */}
          <span aria-hidden="true" className="flex items-end h-[7px] mx-2.5 mt-1.5">
            {/* Cresce em sequência (40 ms entre elas), 120 ms depois da troca de cor do veredito. */}
            <i className="rota-barra block w-full rounded-[3px]"
              style={{ height: h.piorFaixa ? ALTURA[h.piorFaixa] : 3, background: coresParaFaixa(h.piorFaixa).fill, animationDelay: `${120 + i * 40}ms` }} />
          </span>
          <span className="sr-only">{labelFaixa(h.piorFaixa)}</span>
        </li>
      ))}
    </ul>
  );
}
