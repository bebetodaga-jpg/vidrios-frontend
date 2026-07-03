import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// PWA (Workbox) + proxy al backend NestJS (localhost:3000) para usar rutas /api relativas.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-galaxi.svg'],
      manifest: {
        name: 'Vidrios Galaxi — Gestión',
        short_name: 'Galaxi',
        description: 'Sistema de gestión para vidriería y carpintería de aluminio',
        lang: 'es-PE',
        theme_color: '#16335B',
        background_color: '#16335B',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'logo-galaxi.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'logo-galaxi-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea el shell de la app (offline-first); las APIs se sincronizan en sus módulos (S5).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
