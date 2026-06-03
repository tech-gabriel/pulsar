import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

function RotaPublica({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RotaProtegida><MapaPage /></RotaProtegida>} />
      <Route path="/historico" element={<RotaProtegida><HistoricoListPage /></RotaProtegida>} />
      <Route path="/historico/:subprefeituraId" element={<RotaProtegida><HistoricoPage /></RotaProtegida>} />
      <Route path="/dashboard" element={<RotaProtegida><DashboardPage /></RotaProtegida>} />
      <Route path="/noticias" element={<RotaProtegida><NoticiasPage /></RotaProtegida>} />
      <Route path="/configuracoes" element={<RotaProtegida><ConfiguracoesPage /></RotaProtegida>} />

      <Route path="/login" element={<RotaPublica><LoginPage /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><CadastroPage /></RotaPublica>} />
      <Route path="/esqueci-senha" element={<RotaPublica><EsqueciSenhaPage /></RotaPublica>} />
      <Route path="/redefinir-senha" element={<RotaPublica><RedefinirSenhaPage /></RotaPublica>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
