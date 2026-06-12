/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    // Ne configure le proxy que si VITE_API_URL est défini (chaîne non vide)
    // — évite un crash quand Playwright démarre Vite avec VITE_API_URL=''
    ...(process.env.VITE_API_URL
      ? {
          proxy: {
            '/api': {
              target: process.env.VITE_API_URL,
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  test: {
    // Empêche Vitest de ramasser les fichiers Playwright
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
