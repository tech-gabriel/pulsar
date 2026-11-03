import type { CSSProperties } from 'react';
import { textoVeredito } from '../../features/rota/textos';
import type { RotaAvaliacao } from '../../features/rota/tipos';
import { coresParaFaixa } from '../../utils/risco';

// A cor do veredito é a da pior faixa do caminho; sem dado nenhum, o cinza de "sem leitura".
const FAIXA_DO_ESTADO = { PodeIr: 'BAIXO', ComAtencao: 'MODERADO', Esperar: 'ALTO', SemDado: null } as const;
// Chegada de veredito com dado: um pulso. Esperar e Com atenção seguem pulsando; sem leitura nunca pulsa.
const PULSO = { PodeIr: 'chegada', ComAtencao: 'atencao', Esperar: 'esperar', SemDado: undefined } as const;

/**
 * O mesmo cartão de risco do detalhe da subprefeitura (.det-hero), com a marca (núcleo, halo e
 * onda) no lugar do número. Já existe no "Avaliando o caminho…" com o ponto cinza: quando a
 * resposta chega, só a cor (transição de --c) e o texto mudam, sem desmontar o cartão.
 */
export default function VereditoRota({ resultado }: { resultado: RotaAvaliacao | null }) {
  const cores = coresParaFaixa(resultado ? FAIXA_DO_ESTADO[resultado.estado] : null);
  const texto = resultado ? textoVeredito(resultado) : null;
  const estado = resultado?.estado ?? 'carregando';
  return (
    <div className="det-hero rota-veredito" role="status" aria-live="polite" style={{ '--c': cores.fill, '--c-escura': cores.text } as CSSProperties}>
      {/* key no estado: o ponto remonta quando o veredito muda e o pulso de chegada toca de novo. */}
      <span key={estado} aria-hidden="true" className="rota-ponto" data-pulso={resultado ? PULSO[resultado.estado] : undefined} />
      <div key={texto?.titulo ?? 'carregando'} className="rota-texto min-w-0 flex-1">
        <p className="det-hero-faixa" style={{ color: 'var(--text-primary)' }}>{texto?.titulo ?? 'Avaliando o caminho…'}</p>
        {texto ? <p className="det-hero-frase">{texto.detalhe}</p>
          : <span aria-hidden="true" className="skeleton-block block h-3.5 w-4/5 mt-1.5" />}
      </div>
    </div>
  );
}
