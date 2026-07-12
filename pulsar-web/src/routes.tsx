// Este arquivo é config de rotas (data router), não um módulo de componente:
// mistura os guards (não exportados) com o export de dados `routes`, o que o
// react-refresh não consegue tratar como boundary de Fast Refresh — não há
// problema real, o arquivo não é editado via HMR de componente isolado.
/* eslint-disable react-refresh/only-export-components */
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import RootLayout from './RootLayout';
import LandingPage from './pages/LandingPage';
import SobrePage from './pages/SobrePage';
import PrivacidadePage from './pages/PrivacidadePage';
import TermosPage from './pages/TermosPage';
import NovidadesPage from './pages/NovidadesPage';

function RotaProtegida() {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Exige autenticação + role administrativa (ADMIN ou SUPORTE). */
function RotaAdmin() {
  const { estaAutenticado, usuario } = useAuth();
  if (!estaAutenticado) return <Navigate to="/login" replace />;
  const ehAdmin = usuario?.role === 'ADMIN' || usuario?.role === 'SUPORTE';
  return ehAdmin ? <Outlet /> : <Navigate to="/app" replace />;
}

/** Páginas de auth: quem já está logado vai para o app. */
function RotaPublica() {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/app" replace /> : <Outlet />;
}

/** Landing pública: quem já está autenticado é levado direto ao app. */
function RotaLanding() {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/app" replace /> : <Outlet />;
}

// As 5 rotas públicas de conteúdo, compartilhadas entre o router do app e a
// árvore do SSG. Definidas uma única vez para não divergir.
export const rotasPublicas: RouteObject[] = [
  { element: <RotaLanding />, children: [{ index: true, element: <LandingPage /> }] },
  { path: 'sobre', element: <SobrePage /> },
  { path: 'privacidade', element: <PrivacidadePage /> },
  { path: 'termos', element: <TermosPage /> },
  { path: 'novidades', element: <NovidadesPage /> },
];

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      // Públicas de conteúdo (prerenderizadas) — eager.
      ...rotasPublicas,

      // Auth (CSR, lazy).
      {
        element: <RotaPublica />,
        children: [
          { path: 'login', lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }) },
          { path: 'cadastro', lazy: async () => ({ Component: (await import('./pages/CadastroPage')).default }) },
          { path: 'esqueci-senha', lazy: async () => ({ Component: (await import('./pages/EsqueciSenhaPage')).default }) },
          { path: 'redefinir-senha', lazy: async () => ({ Component: (await import('./pages/RedefinirSenhaPage')).default }) },
        ],
      },

      // App autenticado (CSR, lazy).
      {
        element: <RotaProtegida />,
        children: [
          { path: 'app', lazy: async () => ({ Component: (await import('./pages/MapaPage')).default }) },
          { path: 'app/historico', lazy: async () => ({ Component: (await import('./pages/HistoricoListPage')).default }) },
          { path: 'app/historico/:subprefeituraId', lazy: async () => ({ Component: (await import('./pages/HistoricoPage')).default }) },
          { path: 'app/dashboard', lazy: async () => ({ Component: (await import('./pages/DashboardPage')).default }) },
          { path: 'app/noticias', lazy: async () => ({ Component: (await import('./pages/NoticiasPage')).default }) },
          { path: 'app/configuracoes', lazy: async () => ({ Component: (await import('./pages/ConfiguracoesPage')).default }) },
        ],
      },

      // Admin (CSR, lazy) — RotaAdmin já checa auth + role.
      {
        element: <RotaAdmin />,
        children: [
          { path: 'app/admin/usuarios', lazy: async () => ({ Component: (await import('./pages/admin/UsuariosAdminPage')).default }) },
          { path: 'app/admin/sugestoes', lazy: async () => ({ Component: (await import('./pages/admin/SugestoesAdminPage')).default }) },
          { path: 'app/admin/sistema', lazy: async () => ({ Component: (await import('./pages/admin/SistemaAdminPage')).default }) },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

// Árvore podada para o SSG: RootLayout + só as públicas (sem auth/app/lazy).
// O plugin auto-descobre os paths desta árvore, gerando exatamente 5 arquivos.
export const routesSSG: RouteObject[] = [
  {
    element: <RootLayout />,
    children: rotasPublicas,
  },
];
