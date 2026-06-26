import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import TitleManager from './components/TitleManager';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CadastroPage from './pages/CadastroPage';
import EsqueciSenhaPage from './pages/EsqueciSenhaPage';
import RedefinirSenhaPage from './pages/RedefinirSenhaPage';
import MapaPage from './pages/MapaPage';
import HistoricoPage from './pages/HistoricoPage';
import HistoricoListPage from './pages/HistoricoListPage';
import DashboardPage from './pages/DashboardPage';
import NoticiasPage from './pages/NoticiasPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import UsuariosAdminPage from './pages/admin/UsuariosAdminPage';
import SugestoesAdminPage from './pages/admin/SugestoesAdminPage';
import SistemaAdminPage from './pages/admin/SistemaAdminPage';

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Exige autenticação + role administrativa (ADMIN ou SUPORTE). */
function RotaAdmin({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, usuario } = useAuth();
  if (!estaAutenticado) return <Navigate to="/login" replace />;
  const ehAdmin = usuario?.role === 'ADMIN' || usuario?.role === 'SUPORTE';
  return ehAdmin ? <>{children}</> : <Navigate to="/app" replace />;
}

function RotaPublica({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/app" replace /> : <>{children}</>;
}

/** Landing pública: quem já está autenticado é levado direto ao app. */
function RotaLanding({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/app" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <>
      <TitleManager />
      <Routes>
        <Route path="/" element={<RotaLanding><LandingPage /></RotaLanding>} />
        <Route path="/app" element={<RotaProtegida><MapaPage /></RotaProtegida>} />
        <Route path="/app/historico" element={<RotaProtegida><HistoricoListPage /></RotaProtegida>} />
        <Route path="/app/historico/:subprefeituraId" element={<RotaProtegida><HistoricoPage /></RotaProtegida>} />
        <Route path="/app/dashboard" element={<RotaProtegida><DashboardPage /></RotaProtegida>} />
        <Route path="/app/noticias" element={<RotaProtegida><NoticiasPage /></RotaProtegida>} />
        <Route path="/app/configuracoes" element={<RotaProtegida><ConfiguracoesPage /></RotaProtegida>} />
        <Route path="/app/admin/usuarios" element={<RotaAdmin><UsuariosAdminPage /></RotaAdmin>} />
        <Route path="/app/admin/sugestoes" element={<RotaAdmin><SugestoesAdminPage /></RotaAdmin>} />
        <Route path="/app/admin/sistema" element={<RotaAdmin><SistemaAdminPage /></RotaAdmin>} />

        <Route path="/login" element={<RotaPublica><LoginPage /></RotaPublica>} />
        <Route path="/cadastro" element={<RotaPublica><CadastroPage /></RotaPublica>} />
        <Route path="/esqueci-senha" element={<RotaPublica><EsqueciSenhaPage /></RotaPublica>} />
        <Route path="/redefinir-senha" element={<RotaPublica><RedefinirSenhaPage /></RotaPublica>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
