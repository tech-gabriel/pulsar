import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { DURACAO } from '../../motion/presets';

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mola sem quique (Apple: damping 1.0): a folha não foi arremessada, então não deve passar do ponto.
// O MotionConfig reducedMotion="user" do RootLayout troca o deslizar por esmaecer sozinho.
const MOLA = { type: 'spring', bounce: 0, duration: 0.4 } as const;

interface Props {
  aberta: boolean;
  onFechar: () => void;
  /** id do título dentro da folha (aria-labelledby). */
  tituloId: string;
  children: ReactNode;
}

/**
 * Folha de vidro denso (.folha-inferior no index.css) que sobe de baixo no celular, flutuando a 8 px
 * das bordas, e vira caixa central no desktop (SEC2). Modal: foco preso dentro,
 * foco inicial no elemento com `data-foco-inicial` (a ação segura), Esc e toque no fundo fecham, e o foco
 * volta para quem abriu.
 */
export default function FolhaInferior({ aberta, onFechar, tituloId, children }: Props) {
  const mobile = useIsMobile();
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  useEffect(() => { fechar.current = onFechar; }, [onFechar]);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const inicial = painel.current?.querySelector<HTMLElement>('[data-foco-inicial]')
      ?? painel.current?.querySelector<HTMLElement>(FOCAVEIS);
    inicial?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); fechar.current(); return; }
      if (e.key !== 'Tab' || !painel.current) return;
      const itens = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus();
    };
  }, [aberta]);

  return createPortal(
    <AnimatePresence>
      {aberta && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
          <motion.div
            data-testid="folha-fundo"
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURACAO.media }}
            onClick={() => fechar.current()}
          />
          <motion.div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            className="folha-inferior vidro-painel"
            initial={mobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            animate={mobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={mobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            transition={MOLA}
          >
            {mobile && (
              <div aria-hidden="true" className="mx-auto mb-3.5 h-[5px] w-9 rounded-full" style={{ background: 'var(--border-glass-hover)' }} />
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
