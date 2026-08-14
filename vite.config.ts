import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Interview Lab',
        short_name: 'Interview Lab',
        description: 'Animated full-stack interview preparation and adaptive assessment.',
        theme_color: '#315bd6',
        background_color: '#f3f5f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(?:assess|exam|results)(?:\/|$)/],
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
