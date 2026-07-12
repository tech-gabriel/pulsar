import { defineReactSsgConfig } from 'vite-plugin-react-ssg';
import { routesSSG } from './src/routes';

// Passa a árvore PODADA (só as 5 públicas). O plugin não tem allowlist: ele
// auto-descobre os paths estáticos da árvore que recebe. Dando-lhe só as
// públicas, ele gera exatamente 5 arquivos — auth e /app/* ficam CSR.
export default defineReactSsgConfig({
  history: 'browser',
  origin: 'https://app-pulsar.com.br',
  routes: routesSSG,
  paths: ['/', '/sobre', '/privacidade', '/termos', '/novidades'],
});
