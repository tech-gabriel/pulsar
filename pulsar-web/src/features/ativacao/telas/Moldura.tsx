import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { usePrefereMenosMovimento } from '../../../hooks/usePrefereMenosMovimento';
import '../ativacao.css';

interface Props {
  total: number;
  indice: number;
  direcao: 1 | -1;
  /** Identifica a tela atual; a troca de chave dispara a transição. */
  chave: string;
  onVoltar?: () => void;
  acaoTopo?: { rotulo: string; onClick: () => void };
  children: ReactNode;
}

// Mola criticamente amortecida (sem rebote): o padrão da Apple para mover conteúdo.
const MOLA = { type: 'spring', bounce: 0, duration: 0.35 } as const;

export default function Moldura({ total, indice, direcao, chave, onVoltar, acaoTopo, children }: Props) {
  const menos = usePrefereMenosMovimento();
  const variantes = menos
    ? { entra: { opacity: 0 }, centro: { opacity: 1 }, sai: { opacity: 0 } }
    : {
        entra: (d: number) => ({ x: d > 0 ? '100%' : '-100%' }),
        centro: { x: 0 },
        sai: (d: number) => ({ x: d > 0 ? '-100%' : '100%' }),
      };
  const transicao = menos ? { duration: 0.2 } : MOLA;

  return (
    <div className="at-raiz">
      <div className="at-topo">
        {onVoltar ? (
          <button type="button" className="at-voltar" onClick={onVoltar} aria-label="Voltar"><ChevronLeft size={22} /></button>
        ) : <span style={{ width: 44 }} />}
        <div className="at-prog" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={indice + 1} aria-label={`Passo ${indice + 1} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i}><motion.i initial={false} animate={{ scaleX: i <= indice ? 1 : 0 }} transition={transicao} /></span>
          ))}
        </div>
        {acaoTopo
          ? <button type="button" className="at-acao-topo" onClick={acaoTopo.onClick}>{acaoTopo.rotulo}</button>
          : <span style={{ width: 44 }} />}
      </div>
      <div className="at-palco">
        <AnimatePresence initial={false} custom={direcao} mode="popLayout">
          <motion.div key={chave} className="at-tela" custom={direcao} variants={variantes} initial="entra" animate="centro" exit="sai" transition={transicao}>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
