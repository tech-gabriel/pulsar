import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import CadastroPage from './pages/CadastroPage';
import MapaPage from './pages/MapaPage';

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
      <Route
        path="/"
        element={
          <RotaProtegida>
            <MapaPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/login"
        element={
          <RotaPublica>
            <LoginPage />
          </RotaPublica>
        }
      />
      <Route
        path="/cadastro"
        element={
          <RotaPublica>
            <CadastroPage />
          </RotaPublica>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
