import type { HoraRota } from '../../features/rota/tipos';
import { rotuloHora } from '../../features/rota/textos';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';

const MAX_HORAS = 6;

/** Pior faixa do caminho hora a hora: a primeira é "Agora", as outras levam a hora cheia. */
export default function FaixaHorasRota({ horas }: { horas: HoraRota[] }) {
  return (
    <ul aria-label="Risco nas próximas horas" className="flex gap-1.5 mt-3 list-none p-0">
      {horas.slice(0, MAX_HORAS).map((h, i) => (
        <li key={h.inicioUtc} className="flex-1 min-w-0 text-center rounded-[10px] py-1.5"
          style={{ background: 'var(--bg-input)', fontSize: 12, color: 'var(--text-secondary)' }}>
          {i === 0 ? 'Agora' : rotuloHora(h.inicioUtc)}
          <i aria-hidden="true" className="block h-1.5 rounded-[3px] mx-2.5 mt-1.5" style={{ background: coresParaFaixa(h.piorFaixa).fill }} />
          <span className="sr-only">{labelFaixa(h.piorFaixa)}</span>
        </li>
      ))}
    </ul>
  );
}
