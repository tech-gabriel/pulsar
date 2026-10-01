import { defineReactSsgConfig } from 'vite-plugin-react-ssg';
import { routesSSG } from './src/routes';
import { regiaoPaths } from './src/data/regioes-seo';

// Passa a árvore PODADA (só as públicas + regiões). O plugin não tem allowlist:
// ele auto-descobre os paths estáticos da árvore que recebe. Dando-lhe só
// essas rotas, ele gera exatamente 5 institucionais + 5 zonas + 32 subprefeituras — auth e
// /app/* ficam CSR.
export default defineReactSsgConfig({
  history: 'browser',
  origin: 'https://app-pulsar.com.br',
  routes: routesSSG,
  paths: ['/', '/sobre', '/privacidade', '/termos', '/novidades', ...regiaoPaths()],
});
