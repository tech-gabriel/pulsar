import type { CSSProperties } from 'react';
import { textoVeredito } from '../../features/rota/textos';
import type { RotaAvaliacao } from '../../features/rota/tipos';
import { coresParaFaixa } from '../../utils/risco';

// A cor do veredito é a da pior faixa do caminho; sem dado nenhum, o cinza de "sem leitura".
const FAIXA_DO_ESTADO = { PodeIr: 'BAIXO', ComAtencao: 'MODERADO', Esperar: 'ALTO', SemDado: null } as const;

/** O mesmo cartão de risco do detalhe da subprefeitura (.det-hero), com um ponto no lugar do número. */
export default function VereditoRota({ resultado }: { resultado: RotaAvaliacao }) {
  const { titulo, detalhe } = textoVeredito(resultado);
  const cores = coresParaFaixa(FAIXA_DO_ESTADO[resultado.estado]);
  return (
    <div className="det-hero" aria-live="polite" style={{ '--c': cores.fill, '--c-escura': cores.text } as CSSProperties}>
      <span aria-hidden="true" className="w-11 h-11 rounded-full flex-shrink-0"
        style={{ background: 'var(--c)', boxShadow: '0 0 0 7px color-mix(in srgb, var(--c) 22%, transparent)' }} />
      <div className="min-w-0">
        <p className="det-hero-faixa" style={{ color: 'var(--text-primary)' }}>{titulo}</p>
        <p className="det-hero-frase">{detalhe}</p>
      </div>
    </div>
  );
}
