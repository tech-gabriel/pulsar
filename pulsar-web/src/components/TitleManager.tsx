import { useHead } from '@unhead/react';
import { useLocation } from 'react-router-dom';

const MARCA = 'Pulsar';
/** Título institucional completo, usado em rotas sem nome próprio. */
const TITULO_PADRAO = 'Pulsar · Monitoramento Climático em Tempo Real';

// Nome de cada rota exata → vira "Pulsar · Nome". A home (/) fica de fora de
// propósito: usa o título institucional completo (TITULO_PADRAO).
const TITULOS_EXATOS: Record<string, string> = {
  '/app/historico': 'Histórico',
  '/app/dashboard': 'Dashboard',
  '/app/noticias': 'Notícias',
  '/app/configuracoes': 'Configurações',
  '/app/admin/usuarios': 'Usuários · Admin',
  '/app/admin/sugestoes': 'Sugestões · Admin',
  '/app/admin/sistema': 'Sistema · Admin',
  '/login': 'Entrar',
  '/cadastro': 'Criar conta',
  '/esqueci-senha': 'Recuperar senha',
  '/redefinir-senha': 'Redefinir senha',
};

function resolverTitulo(pathname: string, state: unknown): string | null {
  const exato = TITULOS_EXATOS[pathname];
  if (exato) return exato;

  // Detalhe de histórico: usa o nome da subprefeitura quando veio na navegação
  // (a lista passa `state.subNome`); senão cai no genérico.
  if (pathname.startsWith('/app/historico/')) {
    const subNome = (state as { subNome?: string } | null)?.subNome;
    return subNome ? `Histórico de ${subNome}` : 'Histórico';
  }

  return null;
}

/**
 * Mantém o título da aba em sincronia com a rota atual.
 *
 * Vai pelo @unhead, e não escrevendo em `document.title`, porque as páginas
 * públicas definem o título delas por lá (`useSeoHead`). Com dois donos, ao sair
 * de /termos para /login o unhead reescrevia o head no desmonte da página e
 * apagava o "Pulsar · Entrar" que este componente tinha acabado de definir.
 *
 * Com os dois no unhead a ordem é determinística: este componente fica no
 * layout, as páginas ficam abaixo dele, e tag de página sobrescreve tag de
 * layout. Renderizado uma vez dentro do Router; não desenha nada.
 */
export default function TitleManager() {
  const { pathname, state } = useLocation();
  const titulo = resolverTitulo(pathname, state);

  useHead({ title: titulo ? `${MARCA} · ${titulo}` : TITULO_PADRAO });

  return null;
}
