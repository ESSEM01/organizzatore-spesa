import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Chiede all'utente prima di aggiornare: una lista in modifica non va persa (vault, PWA - Service worker e aggiornamenti).
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: true },
      manifest: {
        name: 'Organizzatore spesa',
        short_name: 'Spesa',
        description: 'Lista della spesa sul budget, con le offerte dei supermercati vicini.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#f7f5f0',
        background_color: '#f7f5f0',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // In sviluppo le chiamate /api vanno al backend AdonisJS.
    proxy: { '/api': 'http://localhost:3333' },
  },
})
