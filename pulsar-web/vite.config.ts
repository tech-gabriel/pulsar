import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Alvo do backend para o proxy /api. Padrão: o `dotnet run` local (5245).
// Para testar contra o backend em container (docker compose), rode:
//   VITE_API_TARGET=http://localhost:8080 npm run dev
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:5245'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
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
        start_url: '/',
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
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
