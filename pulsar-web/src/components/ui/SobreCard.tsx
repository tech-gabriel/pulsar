import { Link } from 'react-router-dom';
import { Info, Sparkles, AtSign, ChevronRight, ExternalLink } from 'lucide-react';
import GlassCard from './GlassCard';
import { track } from '../../analytics';
import { APP_VERSION } from '../../data/changelog';
import { INSTAGRAM_URL } from '../../data/social';

/**
 * Seção "Sobre" das Configurações: reúne novidades, Instagram e a versão do app
 * num só lugar. Substitui o antigo rodapé espalhado pelas páginas logadas —
 * agora essas informações ficam concentradas aqui, num card do mesmo padrão das
 * demais seções de Configurações.
 */
export default function SobreCard() {
  return (
    <GlassCard hover={false} padding="lg" className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Info size={15} style={{ color: 'var(--text-secondary)' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
          Sobre
        </h2>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Novidades */}
        <Link to="/novidades" className="w-full flex items-center gap-3 py-2.5 text-left group">
          <Sparkles size={18} style={{ color: 'var(--text-accent)' }} className="flex-shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Novidades</span>
            <span className="block" style={{ fontSize: 12, color: 'var(--text-muted)' }}>O que mudou a cada versão</span>
          </span>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
        </Link>

        {/* Instagram */}
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram do Pulsar"
          onClick={() => track.clicouInstagram('sobre')}
          className="w-full flex items-center gap-3 py-2.5 text-left"
        >
          <AtSign size={18} style={{ color: 'var(--text-accent)' }} className="flex-shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Instagram</span>
            <span className="block" style={{ fontSize: 12, color: 'var(--text-muted)' }}>@appulsar</span>
          </span>
          <ExternalLink size={15} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
        </a>
      </div>

      {/* Versão */}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Versão</span>
        <Link
          to="/novidades"
          className="transition-colors hover:text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)' }}
          title="Ver novidades desta versão"
        >
          v{APP_VERSION}
        </Link>
      </div>
    </GlassCard>
  );
}
