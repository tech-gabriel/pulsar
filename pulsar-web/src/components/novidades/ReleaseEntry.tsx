import type { Release } from '../../data/changelog';
import TagMudanca from './TagMudanca';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Formata "2026-06-30" como "30 jun 2026" sem passar por Date (evita fuso). */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]} ${ano}`;
}

/** Uma entrada de release no changelog: cabeçalho (versão + data), resumo e itens. */
export default function ReleaseEntry({ release }: { release: Release }) {
  return (
    <section className="py-6" style={{ borderTop: '1px solid var(--border-glass)' }}>
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}
        >
          v{release.versao}
        </h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatarData(release.data)}</span>
      </div>

      {release.resumo && (
        <p className="mt-1.5" style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {release.resumo}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-4 list-none pl-0">
        {release.itens.map((item, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 flex-wrap">
              <TagMudanca tipo={item.tipo} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{item.titulo}</span>
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.descricao}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
