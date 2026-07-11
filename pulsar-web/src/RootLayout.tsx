import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './hooks/ThemeProvider';
import { ToastProvider } from './contexts/ToastProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { AlertasProvider } from './contexts/AlertasProvider';
import { AnalyticsBridge } from './analytics';
import TitleManager from './components/TitleManager';
import ToastContainer from './components/ui/ToastContainer';

/**
 * Layout raiz do data router: concentra os providers e as "bridges" que
 * dependem do contexto de rota (analytics/título). Todas as rotas descem daqui
 * via <Outlet/>.
 */
export default function RootLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AlertasProvider>
              <AnalyticsBridge />
              <TitleManager />
              <Outlet />
              <ToastContainer />
            </AlertasProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
