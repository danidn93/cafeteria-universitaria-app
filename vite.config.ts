import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // 🔴 PWA DESACTIVADA EN DESARROLLO (CLAVE)
      devOptions: {
        enabled: false,
      },

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg',
      ],

      manifest: {
        name: 'Cafetería UNEMI',
        short_name: 'Café App',
        description: 'App de cafetería para el personal de UNEMI.',
        theme_color: '#002E45',
        background_color: '#002E45',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // ✅ Precache SOLO archivos base (no datos, no imágenes pesadas)
        globPatterns: [
          '**/*.{js,css,html,svg}',
          'icon-*.png',
          'manifest.webmanifest',
        ],

        runtimeCaching: [
          // 🚫 NUNCA cachear SUPABASE REST (datos vivos)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },

          // 🚫 NUNCA cachear SUPABASE REALTIME (websocket)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/realtime\/v1\/.*/i,
            handler: 'NetworkOnly',
          },

          // ✅ Fuentes locales
          {
            urlPattern: ({ request }) =>
              request.destination === 'font' &&
              request.url.includes('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ Imágenes locales (/assets)
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' &&
              request.url.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ Imágenes públicas de Supabase (Storage)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
