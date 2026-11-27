import { Link } from 'react-router-dom';
import { CIDADE_BAIXADA } from '../../data/baixada-seo';

const CIDADES = [
  { slug: 'sao-paulo', nome: 'São Paulo', path: '/' },
  { slug: CIDADE_BAIXADA.slug, nome: CIDADE_BAIXADA.nome, path: CIDADE_BAIXADA.path },
] as const;

/** Escolha de cidade no topo das landings. A cidade atual vem preenchida; a outra é um link. */
export default function SeletorCidade({ atual }: { atual: 'sao-paulo' | 'baixada-santista' }) {
  return (
    <nav aria-label="Cidade" className="lp-superficie inline-flex p-1 gap-1 rounded-full">
      {CIDADES.map((c) => {
        const ligado = c.slug === atual;
        return (
          <Link key={c.slug} to={c.path} aria-current={ligado ? 'page' : undefined}
            style={ligado ? undefined : { border: 0, background: 'transparent' }}
            className={`lp-chip inline-flex items-center h-10 px-4 rounded-full text-[14px] font-semibold ${ligado ? 'lp-chip-ligado' : ''}`}>
            {c.nome}
          </Link>
        );
      })}
    </nav>
  );
}
