import { Link } from 'react-router-dom';
import { APP_VERSION } from '../data/changelog';

/**
 * Selo discreto com a versão atual do app, clicável para a página de novidades.
 * Reutilizado no rodapé da landing, no rodapé do app, em Configurações e no
 * painel de Sistema. Fonte da versão: APP_VERSION (derivado do changelog).
 */
export default function SeloVersao({ className }: { className?: string }) {
  return (
    <Link
      to="/novidades"
      className={['transition-colors hover:text-[var(--text-primary)]', className]
        .filter(Boolean)
        .join(' ')}
      style={{ fontSize: 12, color: 'var(--text-muted)' }}
      title="Ver novidades desta versão"
    >
      v{APP_VERSION}
    </Link>
  );
}
