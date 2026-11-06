import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

/**
 * Grupo no estilo Ajustes do iPhone: rótulo em maiúsculas fora do cartão, cartão sólido sem
 * recuo interno e linhas separadas por um fio que começa depois do ícone (index.css, .grupo-ajustes).
 */
export function GrupoAjustes({ rotulo, rodape, children }: { rotulo?: string; rodape?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      {rotulo && (
        <h2 className="mx-4 mb-2 uppercase" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', color: 'var(--text-muted)' }}>
          {rotulo}
        </h2>
      )}
      <div className="glass-card grupo-ajustes">{children}</div>
      {rodape && <div className="mx-4 mt-2" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text-muted)' }}>{rodape}</div>}
    </section>
  );
}

/** Seta padrão da linha que leva a outro lugar. */
export const Seta = () => <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />;

/** O interruptor de sempre (theme-switch), só visual: quem o carrega é a linha com role="switch". */
export const Interruptor = ({ ligado }: { ligado: boolean }) => (
  <span className={['theme-switch', ligado ? 'on' : ''].join(' ')} aria-hidden="true">
    <span className="theme-switch-knob" />
  </span>
);

interface Linha {
  Icone: LucideIcon;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** Seta, interruptor, ação em texto ou contagem. */
  direita?: ReactNode;
  /** Botão (ou interruptor, se `ligado` vier). */
  onClick?: () => void;
  ligado?: boolean;
  /** Link interno. */
  to?: string;
  /** Link externo (nova aba). */
  href?: string;
  ariaLabel?: string;
  onClickLink?: () => void;
  disabled?: boolean;
}

/** Linha de 52 px: ícone num quadradinho, título e subtítulo com reticências, e o lado direito. */
export function LinhaAjuste({ Icone, titulo, subtitulo, direita, onClick, ligado, to, href, ariaLabel, onClickLink, disabled }: Linha) {
  const miolo = (
    <>
      <span aria-hidden="true" className="grid place-items-center w-[30px] h-[30px] rounded-lg flex-shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-accent)' }}>
        <Icone size={18} />
      </span>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="truncate" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{titulo}</span>
        {subtitulo && <span className="truncate" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitulo}</span>}
      </span>
      {direita && <span className="flex-shrink-0 flex items-center gap-1.5" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{direita}</span>}
    </>
  );
  const classe = 'linha-ajuste flex w-full items-center gap-3 text-left';
  if (to) return <Link to={to} aria-label={ariaLabel} onClick={onClickLink} className={classe}>{miolo}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} onClick={onClickLink} className={classe}>{miolo}</a>;
  if (onClick) {
    const interruptor = ligado !== undefined ? { role: 'switch', 'aria-checked': ligado } : {};
    return <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} className={classe} {...interruptor}>{miolo}</button>;
  }
  return <div className={classe}>{miolo}</div>;
}
