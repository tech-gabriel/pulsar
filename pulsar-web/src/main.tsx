import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
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

const container = document.getElementById('app')!;

const arvore = (
  <StrictMode>
    <ErrorBoundary>
      <UnheadProvider head={head}>
        <RouterProvider router={router} />
      </UnheadProvider>
    </ErrorBoundary>
  </StrictMode>
);

// As páginas pré-renderizadas chegam com HTML dentro do container e são hidratadas.
// As demais rotas (/login, /cadastro, /app/*) são servidas pelo shell vazio
// `spa.html` e precisam de montagem do zero: chamar hydrateRoot num container
// vazio não é hidratação, e num container com o HTML de OUTRA rota o React não
// consegue reaproveitar nada e acaba deixando as duas árvores na página.
if (container.firstChild) {
  hydrateRoot(container, arvore);
} else {
  createRoot(container).render(arvore);
}
