import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MARCA = 'Pulsar';
/** Título institucional completo, usado em rotas sem nome próprio. */
const TITULO_PADRAO = 'Pulsar — Monitoramento Climático em Tempo Real';

// Nome de cada rota exata → vira "Pulsar · Nome". A home (/) fica de fora de
// propósito: usa o título institucional completo (TITULO_PADRAO).
const TITULOS_EXATOS: Record<string, string> = {
  '/historico': 'Histórico',
  '/dashboard': 'Dashboard',
  '/noticias': 'Notícias',
  '/configuracoes': 'Configurações',
  '/admin/usuarios': 'Usuários · Admin',
  '/admin/sugestoes': 'Sugestões · Admin',
  '/admin/sistema': 'Sistema · Admin',
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
  if (pathname.startsWith('/historico/')) {
    const subNome = (state as { subNome?: string } | null)?.subNome;
    return subNome ? `Histórico de ${subNome}` : 'Histórico';
  }

  return null;
}

/**
 * Mantém o título da aba (`document.title`) em sincronia com a rota atual.
 * Renderizado uma vez dentro do Router; não desenha nada.
 */
export default function TitleManager() {
  const { pathname, state } = useLocation();

  useEffect(() => {
    const titulo = resolverTitulo(pathname, state);
    document.title = titulo ? `${MARCA} · ${titulo}` : TITULO_PADRAO;
  }, [pathname, state]);

  return null;
}
