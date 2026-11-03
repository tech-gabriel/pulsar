import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { textoVeredito } from '../../features/rota/textos';
import type { RotaAvaliacao } from '../../features/rota/tipos';
import { coresParaFaixa } from '../../utils/risco';

// A cor do veredito é a da pior faixa do caminho; sem dado nenhum, o cinza de "sem leitura".
const FAIXA_DO_ESTADO = { PodeIr: 'BAIXO', ComAtencao: 'MODERADO', Esperar: 'ALTO', SemDado: null } as const;
// Chegada de veredito com dado: um pulso. Esperar e Com atenção seguem pulsando; sem leitura nunca pulsa.
const PULSO = { PodeIr: 'chegada', ComAtencao: 'atencao', Esperar: 'esperar', SemDado: undefined } as const;
const TROCA = { duration: 0.16, ease: 'easeOut' } as const;

/**
 * O mesmo cartão de risco do detalhe da subprefeitura (.det-hero), com a marca (onda, halo e
 * núcleo empilhados numa caixa do tamanho do ponto) no lugar do número. Já existe no
 * "Avaliando o caminho…" com o ponto cinza: quando a resposta chega, a cor transiciona (--c)
 * e o texto troca em crossfade, sem desmontar o cartão.
 */
export default function VereditoRota({ resultado }: { resultado: RotaAvaliacao | null }) {
  const cores = coresParaFaixa(resultado ? FAIXA_DO_ESTADO[resultado.estado] : null);
  const texto = resultado ? textoVeredito(resultado) : null;
  const estado = resultado?.estado ?? 'carregando';
  return (
    <div className="det-hero rota-veredito" role="status" aria-live="polite" style={{ '--c': cores.fill, '--c-escura': cores.text } as CSSProperties}>
      {/* key no estado: o ponto remonta quando o veredito muda e o pulso de chegada toca de novo. */}
      <span key={estado} aria-hidden="true" className="rota-ponto" data-pulso={resultado ? PULSO[resultado.estado] : undefined}>
        <span className="rota-ponto-onda" />
        <span className="rota-ponto-halo" />
        <span className="rota-ponto-nucleo" />
      </span>
      {/* popLayout: o texto que sai fica por cima, posicionado, enquanto o novo entra. */}
      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={texto?.titulo ?? 'carregando'} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: TROCA }} exit={{ opacity: 0, transition: TROCA }}>
            <p className="det-hero-faixa" style={{ color: 'var(--text-primary)' }}>{texto?.titulo ?? 'Avaliando o caminho…'}</p>
            {texto ? <p className="det-hero-frase">{texto.detalhe}</p>
              : <span aria-hidden="true" className="skeleton-block block h-3.5 w-4/5 mt-1.5" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
