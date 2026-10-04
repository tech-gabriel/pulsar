import { ChevronRight } from 'lucide-react';
import BadgeRisco from '../../components/ui/BadgeRisco';
import { coresParaFaixa } from '../../utils/risco';
import { rotuloPerigo, type Area } from './areas';
import './cidade.css';

/** A linha de área do app inteiro: nome, zona como legenda (+ perigo com risco), selo e seta. */
export default function LinhaArea({ area, onClick }: { area: Area; onClick: () => void }) {
  const perigo = rotuloPerigo(area);
  return (
    <button type="button" className="linha-area" onClick={onClick}>
      <span className="linha-area-ponto" style={{ background: coresParaFaixa(area.faixaRisco).fill }} aria-hidden="true" />
      <span className="linha-area-nome">
        {area.nome}
        <small>{area.zona}{perigo ? ` · ${perigo}` : ''}</small>
      </span>
      <BadgeRisco faixa={area.faixaRisco} size="sm" />
      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
    </button>
  );
}
