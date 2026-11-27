import { defineReactSsgConfig } from 'vite-plugin-react-ssg';
import { routesSSG } from './src/routes';
import { regiaoPaths, PREFIXO_REGIAO } from './src/data/regioes-seo';
import { municipios } from './src/data/baixada-seo';

// Passa a árvore PODADA (só as públicas + regiões). O plugin não tem allowlist:
// ele auto-descobre os paths estáticos da árvore que recebe. Dando-lhe só
// essas rotas, ele gera exatamente as institucionais + 5 zonas + 32 subprefeituras +
// 9 municípios da Baixada; auth e /app/* ficam CSR. Os municípios entram aqui e não em
// regiaoPaths(): regioes-seo.ts não importa nada (um script Node o lê).
export default defineReactSsgConfig({
  history: 'browser',
  origin: 'https://app-pulsar.com.br',
  routes: routesSSG,
  paths: [
    '/', '/baixada-santista', '/sobre', '/privacidade', '/termos', '/novidades', '/pontos-de-alagamento-hoje',
    ...regiaoPaths(),
    ...municipios.map((m) => `${PREFIXO_REGIAO}/${m.slug}`),
  ],
});
