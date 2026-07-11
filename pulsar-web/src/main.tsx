import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { initAnalytics } from './analytics';
import { routes } from './routes';
import './index.css';

initAnalytics();

const head = createHead();
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UnheadProvider head={head}>
        <RouterProvider router={router} />
      </UnheadProvider>
    </ErrorBoundary>
  </StrictMode>,
);
