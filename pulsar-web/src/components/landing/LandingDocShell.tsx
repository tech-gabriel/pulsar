import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';

/**
 * Casca compartilhada das páginas institucionais públicas (Sobre, Privacidade,
 * Termos). Reaproveita a navbar e o rodapé da landing e enquadra o conteúdo
 * num container de leitura confortável. O conteúdo entra com um fade/subida.
 */
export default function LandingDocShell({
  titulo,
  subtitulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  atualizadoEm?: string;
  children: ReactNode;
}) {
  // Páginas de leitura: começar do topo ao navegar até elas.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="auth-bg landing-root">
      <LandingNav />
      <main className="landing-section !pt-16 !pb-10" style={{ maxWidth: 820 }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURACAO.lenta, ease: EASE_SUAVE }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors hover:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
            Voltar à página inicial
          </Link>

          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 46px)', color: 'var(--text-primary)' }}
          >
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-4 max-w-2xl" style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {subtitulo}
            </p>
          )}
          {atualizadoEm && (
            <p className="mt-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Última atualização: {atualizadoEm}
            </p>
          )}

          <div className="landing-prose mt-10">{children}</div>
        </motion.div>
      </main>
      <LandingFooter />
    </div>
  );
}
