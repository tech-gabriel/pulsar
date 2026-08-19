import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: {
      // Fuso fixo do RUNNER, e não do produto: o backend grava UTC e a UI converte
      // pelo fuso do navegador, então o resultado de qualquer teste que formate hora
      // depende de onde ele roda. A máquina de desenvolvimento está em São Paulo e o
      // runner do CI está em UTC, e sem fixar isto o mesmo teste dá dois resultados.
      // Escolhido justamente um fuso DIFERENTE de UTC: se o runner fosse UTC, um bug
      // que lesse o instante como hora local passaria despercebido, porque nesse fuso
      // as duas leituras coincidem. Isto não contraria a regra de nunca fixar
      // America/Sao_Paulo no produto: aqui é o carimbo do navegador simulado.
      TZ: 'America/Sao_Paulo',
    },
  },
});
