import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { createBrowserRouter, RouterProvider, type HydrationState } from 'react-router-dom';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { initAnalytics } from './analytics';
import { routes } from './routes';
import './index.css';

initAnalytics();

const head = createHead();
const hydrationData = (window as Window & {
  __staticRouterHydrationData?: HydrationState;
}).__staticRouterHydrationData;

const router = createBrowserRouter(routes, {
  ...(hydrationData ? { hydrationData } : {}),
});

hydrateRoot(
  document.getElementById('app')!,
  <StrictMode>
    <ErrorBoundary>
      <UnheadProvider head={head}>
        <RouterProvider router={router} />
      </UnheadProvider>
    </ErrorBoundary>
  </StrictMode>,
);
