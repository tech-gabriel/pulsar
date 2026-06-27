import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './contexts/AuthProvider';
import { AlertasProvider } from './contexts/AlertasProvider';
import { ToastProvider } from './contexts/ToastProvider';
import { ThemeProvider } from './hooks/ThemeProvider';
import ToastContainer from './components/ui/ToastContainer';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <AlertasProvider>
                  <App />
                  <ToastContainer />
                </AlertasProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </MotionConfig>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
