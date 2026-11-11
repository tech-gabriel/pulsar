import { Gauge } from 'lucide-react';
import type { ChuvaMedida } from '../../types';
import { horaCurta } from '../../utils/data';
import { textoChuvaMedida } from '../../utils/chuvaMedida';

/**
 * Chuva medida por um posto do CGE-SP (AS7). É fato, não estimativa: por isso fica logo abaixo
 * do risco, junto do outro dado oficial, com a fonte dita. Duas linhas só, de propósito: o
 * bloco não pode pesar mais que o risco (pedido do user). Some sem leitura que dê para afirmar.
 */
export default function ChuvaMedidaCge({ medida }: { medida: ChuvaMedida | null | undefined }) {
  const texto = medida ? textoChuvaMedida(medida) : null;
  if (!medida || !texto) return null;
  const hora = horaCurta(medida.coletadoEm);

  return (
    <section className="det-bloco det-medida" aria-label="Chuva medida pelo CGE">
      <div className="det-medida-l">
        <span className="det-tile-t"><Gauge size={14} aria-hidden="true" />{medida.vizinho ? 'Chuva medida perto' : 'Chuva medida'}</span>
        <span className="det-medida-fonte" title={`Posto ${medida.posto}`}>{`CGE · posto ${medida.posto}`}</span>
      </div>
      <div className="det-medida-l">
        <span className="det-medida-v">{texto}</span>
        {hora && <span className="det-medida-fonte">{`às ${hora}`}</span>}
      </div>
    </section>
  );
}
