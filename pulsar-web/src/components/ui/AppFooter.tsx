import { Link } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import SeloVersao from '../SeloVersao';
import { INSTAGRAM_URL } from '../../data/social';

/**
 * Rodapé enxuto das páginas de conteúdo do app logado (Configurações, Dashboard,
 * Histórico, Notícias). Fora do mapa, que é tela cheia. Dá visibilidade à versão
 * e um caminho pras novidades e pro Instagram.
 */
export default function AppFooter() {
  return (
    <footer
      className="mt-10 pt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 12.5 }}
    >
      <Link to="/novidades" className="transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
        Novidades
      </Link>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram do Pulsar"
        className="transition-colors hover:text-[var(--text-primary)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <AtSign size={16} />
      </a>
      <SeloVersao />
    </footer>
  );
}
