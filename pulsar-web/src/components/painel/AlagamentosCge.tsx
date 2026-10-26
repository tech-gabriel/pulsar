import { TriangleAlert } from 'lucide-react';
import type { PontoAlagamentoCge } from '../../types';
import { horaCurta } from '../../utils/data';

/** Quantos pontos listar antes do "e mais N": o painel é estreito no celular. */
const MAX_LISTADOS = 3;

/** A referência do CGE às vezes é só um número de imóvel ("12"), que não ajuda ninguém. */
const temNome = (texto: string) => /[a-zA-ZÀ-ú]/.test(texto);

/**
 * Pontos de alagamento ativos agora, segundo o CGE-SP. Diferente do score, não é estimativa:
 * por isso fica acima de tudo no detalhe, com a fonte dita. Some sozinho sem pontos.
 */
export default function AlagamentosCge({ pontos }: { pontos: PontoAlagamentoCge[] | undefined }) {
  if (!pontos || pontos.length === 0) return null;

  const listados = pontos.slice(0, MAX_LISTADOS);
  const resto = pontos.length - listados.length;

  return (
    <section className="rounded-[10px] px-4 py-3 mb-3 bg-risco-alto-bg text-risco-alto-text" aria-label="Alagamentos agora">
      <p className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 14 }}>
        <TriangleAlert size={16} aria-hidden="true" />
        {pontos.length === 1 ? 'Alagamento agora' : `${pontos.length} pontos de alagamento agora`}
      </p>
      <ul className="mt-1.5 space-y-1" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
        {listados.map((p) => (
          <li key={`${p.via}-${p.inicioUtc}`}>
            <span className="font-semibold">{p.via}</span>
            {temNome(p.referencia) && `, perto de ${p.referencia}`}
            {`. Desde ${horaCurta(p.inicioUtc)}`}
            {!p.transitavel && ', sem passagem'}
          </li>
        ))}
      </ul>
      {resto > 0 && <p className="mt-1" style={{ fontSize: 12.5 }}>{resto === 1 ? 'E mais 1 ponto.' : `E mais ${resto} pontos.`}</p>}
      <p className="mt-1.5" style={{ fontSize: 11.5, opacity: 0.8 }}>Fonte: CGE, da Prefeitura de São Paulo.</p>
    </section>
  );
}
