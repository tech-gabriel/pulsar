import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Alvo do backend para o proxy /api. Padrão: o `dotnet run` local (5245).
// Para testar contra o backend em container (docker compose), rode:
//   VITE_API_TARGET=http://localhost:8080 npm run dev
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:5245'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
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
