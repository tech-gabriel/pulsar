import { useEffect } from 'react';
import { AtSign } from 'lucide-react';
import LandingDocShell from '../components/landing/LandingDocShell';
import ReleaseEntry from '../components/novidades/ReleaseEntry';
import { track } from '../analytics';
import { APP_VERSION, CHANGELOG } from '../data/changelog';
import { INSTAGRAM_URL } from '../data/social';

/**
 * Página pública de novidades (rota `/novidades`). Changelog curado por versão,
 * do mais recente pro mais antigo. Reutiliza o molde institucional da landing.
 */
export default function NovidadesPage() {
  useEffect(() => {
    track.viuNovidades(APP_VERSION);
  }, []);

  return (
    <LandingDocShell
      titulo="Novidades"
      subtitulo="O que há de novo no Pulsar, versão por versão."
    >
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Seguir o Pulsar no Instagram"
        className="flex items-center gap-3 rounded-xl p-4 no-underline transition-colors hover:bg-[var(--bg-glass-hover)]"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-glass)' }}
      >
        <AtSign size={22} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
        <span>
          <span className="block" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Siga @appulsar no Instagram
          </span>
          <span className="block" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Notícias climáticas e novidades do app, direto no seu feed.
          </span>
        </span>
      </a>

      <div className="mt-4">
        {CHANGELOG.map((release) => (
          <ReleaseEntry key={release.versao} release={release} />
        ))}
      </div>
    </LandingDocShell>
  );
}
