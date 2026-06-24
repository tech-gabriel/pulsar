import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import TitleManager from './components/TitleManager';
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
  return ehAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

function RotaPublica({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <>
      <TitleManager />
      <Routes>
        <Route path="/" element={<RotaProtegida><MapaPage /></RotaProtegida>} />
        <Route path="/historico" element={<RotaProtegida><HistoricoListPage /></RotaProtegida>} />
        <Route path="/historico/:subprefeituraId" element={<RotaProtegida><HistoricoPage /></RotaProtegida>} />
        <Route path="/dashboard" element={<RotaProtegida><DashboardPage /></RotaProtegida>} />
        <Route path="/noticias" element={<RotaProtegida><NoticiasPage /></RotaProtegida>} />
        <Route path="/configuracoes" element={<RotaProtegida><ConfiguracoesPage /></RotaProtegida>} />
        <Route path="/admin/usuarios" element={<RotaAdmin><UsuariosAdminPage /></RotaAdmin>} />
        <Route path="/admin/sugestoes" element={<RotaAdmin><SugestoesAdminPage /></RotaAdmin>} />
        <Route path="/admin/sistema" element={<RotaAdmin><SistemaAdminPage /></RotaAdmin>} />

        <Route path="/login" element={<RotaPublica><LoginPage /></RotaPublica>} />
        <Route path="/cadastro" element={<RotaPublica><CadastroPage /></RotaPublica>} />
        <Route path="/esqueci-senha" element={<RotaPublica><EsqueciSenhaPage /></RotaPublica>} />
        <Route path="/redefinir-senha" element={<RotaPublica><RedefinirSenhaPage /></RotaPublica>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
