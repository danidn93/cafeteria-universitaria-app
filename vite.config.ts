// client/vite.config.ts
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true, // <--- ESTO ES CLAVE
        type: 'module',
      },
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
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      
      workbox: {
        // --- ¡ARREGLO 1! ---
        // Ya no le pedimos que precache todos los .png y .jpg.
        // Solo los archivos base y los íconos de la app.
        globPatterns: ['**/*.{js,css,html,svg}', 'icon-*.png', 'manifest.webmanifest'],
        
        // --- ¡ARREGLO 2! ---
        // Añadimos las imágenes pesadas y fuentes al 'runtimeCaching'.
        // Se cachearán después de la primera visita.
        runtimeCaching: [
          {
            // Cachea las fuentes locales (Aventura)
            urlPattern: ({ request }) => request.destination === 'font' && request.url.includes('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 año
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cachea las imágenes locales (TUS FONDOS)
            urlPattern: ({ request }) => request.destination === 'image' && request.url.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-assets-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 días
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cachea las imágenes de Supabase (tu regla anterior)
            urlPattern: new RegExp(`^https://jipksxcjqcxiikepawor\.supabase\.co/storage/v1/object/public/items/.*`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 semana
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})