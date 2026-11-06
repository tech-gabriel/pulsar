import { Link } from 'react-router-dom';
import { ChevronLeft, Star, X } from 'lucide-react';
import Header from '../components/ui/Header';
import { GrupoAjustes } from '../components/configuracoes/GrupoAjustes';
import { useFavoritos } from '../hooks/useFavoritos';

/** Lista das subprefeituras favoritas, com o remover de cada uma. Adicionar continua sendo na estrela do mapa. */
export default function SubprefeiturasAcompanhoPage() {
  const { favoritos, toggleFavorito } = useFavoritos();
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 640, paddingTop: 80, paddingBottom: 120 }}>
        <Link to="/app/configuracoes" className="inline-flex items-center gap-0.5 min-h-11 -ml-1.5" style={{ fontSize: 15, color: 'var(--text-accent)' }}>
          <ChevronLeft size={20} aria-hidden="true" /> Configurações
        </Link>
        <h1 className="mb-5 mx-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, lineHeight: 1.2, color: 'var(--text-primary)' }}>
          Subprefeituras que acompanho
        </h1>

        {favoritos.length === 0 ? (
          <p className="mx-1" style={{ fontSize: 15, color: 'var(--text-muted)' }}>
            Você ainda não acompanha nenhuma.{' '}
            <Link to="/app" className="inline-block py-1 hover:underline" style={{ color: 'var(--text-accent)' }}>Abrir o mapa</Link>
          </p>
        ) : (
          <GrupoAjustes rodape="Para acompanhar outra, toque na estrela dela no mapa.">
            {favoritos.map((f) => (
              <div key={f.subprefeituraId} className="linha-ajuste flex items-center gap-3" style={{ paddingRight: 4 }}>
                <span aria-hidden="true" className="grid place-items-center w-[30px] h-[30px] rounded-lg flex-shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-accent)' }}>
                  <Star size={18} fill="currentColor" />
                </span>
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                  {f.nome} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {f.regiaoNome}</span>
                </span>
                <button type="button" onClick={() => toggleFavorito(f.subprefeituraId)} aria-label={`Deixar de acompanhar ${f.nome}`}
                  className="w-11 h-11 grid place-items-center flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
            ))}
          </GrupoAjustes>
        )}
      </main>
    </div>
  );
}
