import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import reactSsg from 'vite-plugin-react-ssg'

// Alvo do backend para o proxy /api. Padrão: o `dotnet run` local (5245).
// Para testar contra o backend em container (docker compose), rode:
//   VITE_API_TARGET=http://localhost:8080 npm run dev
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:5245'

// Mesmo proxy para o dev server e para o preview: são a mesma necessidade, e
// duas cópias divergiriam na primeira vez que o alvo mudasse.
const proxyApi = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
    secure: false,
  },
}

// Guarda uma cópia do index.html AINDA VAZIO como `spa.html`, para o fallback de
// roteamento do render.yaml servir as rotas que não são pré-renderizadas
// (/login, /cadastro, /app/*). Sem isso o fallback entrega o index.html final,
// que o SSG sobrescreveu com a landing inteira: o React acha DOM de servidor que
// não bate com a rota, não consegue reaproveitar, e o resultado em produção era a
// landing renderizada ACIMA do formulário de login.
//
// Este plugin precisa rodar ANTES do vite-plugin-react-ssg, que no seu closeBundle
// reescreve o dist/index.html com a landing pré-renderizada. Como os dois usam
// closeBundle, quem manda é a ordem do array `plugins` abaixo. A checagem do
// `<div id="app"></div>` vazio é a rede de proteção: se um dia a ordem inverter,
// o build falha aqui em vez de publicar um shell com a landing dentro.
const APP_VAZIO = '<div id="app"></div>'

function shellSpa(): Plugin {
  let dirSaida = ''
  return {
    name: 'pulsar-shell-spa',
    apply: 'build',
    configResolved(config) {
      dirSaida = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const origem = path.join(dirSaida, 'index.html')
      if (!existsSync(origem)) return // build de outro ambiente (ex.: o do service worker)

      const html = readFileSync(origem, 'utf8')
      if (!html.includes(APP_VAZIO)) {
        this.error(
          'shellSpa: o dist/index.html já veio pré-renderizado. O shell do fallback ' +
          'de SPA sairia com a landing dentro. Coloque shellSpa() antes de reactSsg().',
        )
      }

      // O template declara canonical e og:url da home. No shell isso viraria
      // "/login é a home" para quem não executa JS. Sem a tag, cada URL é
      // canônica de si mesma, e o CanonicalManager põe a correta ao montar.
      const shell = html
        .replace(/\s*<link rel="canonical"[^>]*>/g, '')
        .replace(/\s*<meta property="og:url"[^>]*>/g, '')

      writeFileSync(path.join(dirSaida, 'spa.html'), shell)
    },
  }
}

// Reproduz no `vite preview` o fallback `/* -> /spa.html` do render.yaml. Sem isto o
// preview entrega o dist/index.html (que o SSG substituiu pela landing) em /app e
// /login, o React acha DOM de servidor de outra rota e a hidratação estoura com o
// erro #418 no console. O efeito colateral era pior do que o erro em si: a única
// tela de verificação visual deste projeto mostrava um shell que produção não serve,
// e um erro vermelho permanente escondia os erros de verdade.
//
// A regra é a mesma do render.yaml, na mesma ordem: arquivo real primeiro (assets e
// as rotas pré-renderizadas, que existem como `<rota>/index.html`), spa.html para o
// resto. Só `apply: 'serve'`: nada disto vai para o build.
function fallbackSpaNoPreview(): Plugin {
  let dirSaida = ''
  return {
    name: 'pulsar-fallback-spa-preview',
    apply: 'serve',
    configResolved(config) {
      dirSaida = path.resolve(config.root, config.build.outDir)
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Só navegação de documento. Este middleware roda ANTES dos internos, o
        // proxy incluído, então sem esta guarda ele reescrevia /api/auth/login para
        // /spa.html e o login voltava HTML no lugar do JSON. O Accept é o que separa
        // as duas coisas: navegador pedindo página manda text/html, XHR não.
        if (!req.headers.accept?.includes('text/html')) return next()
        const cru = (req.url ?? '/').split('?')[0].split('#')[0]
        // URL malformada (um "%" solto) faz o decode lançar, e uma exceção aqui
        // derrubaria a resposta inteira em vez de só não reescrever.
        let caminho: string
        try {
          caminho = decodeURIComponent(cru)
        } catch {
          return next()
        }
        if (caminho.startsWith('/api/')) return next()
        // A raiz é a landing pré-renderizada e o /spa.html é ele mesmo: nenhum dos
        // dois pode ser reescrito, sob pena de laço.
        if (caminho === '/' || caminho === '/spa.html') return next()
        // `join` já normaliza o `..`; a checagem seguinte impede sair do dist e
        // transformar o fallback em leitura de arquivo arbitrário do disco.
        const alvo = path.join(dirSaida, caminho)
        if (!alvo.startsWith(dirSaida)) return next()
        // existsSync cobre os dois casos de uma vez: arquivo real (assets) e
        // diretório de rota pré-renderizada, que o sirv resolve para o index.html.
        if (existsSync(alvo)) return next()
        req.url = '/spa.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    shellSpa(),
    fallbackSpaNoPreview(),
    reactSsg(),
    VitePWA({
      // Service worker próprio (src/sw.ts) para tratar push/notificationclick.
      // injectionPoint undefined = sem precache do Workbox; o SW é focado em push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: { injectionPoint: undefined },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Pulsar — Monitoramento Climático',
        short_name: 'Pulsar',
        description: 'Monitoramento climático em tempo real para São Paulo, com alertas de risco por região.',
        lang: 'pt-BR',
        start_url: '/app',
        display: 'standalone',
        theme_color: '#052F4A',
        background_color: '#052F4A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: proxyApi,
  },
  // O `preview` serve o build, e é nele que a verificação visual deste projeto
  // acontece (o dev server esconde erro de SSG e de tipo). Sem o mesmo proxy do
  // dev server, toda chamada a /api dava 404 na porta 4173 e o app parecia
  // quebrado por um motivo que não é dele. Em produção nada disto roda: quem
  // serve o build é o Render, com o rewrite do render.yaml.
  preview: {
    proxy: proxyApi,
  },
})
