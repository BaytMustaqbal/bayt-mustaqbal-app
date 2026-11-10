import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Bayt Mustaqbal',
        short_name: 'Bayt Mustaqbal',
        theme_color: '#0A192F',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      }
    })
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        // Pengujian lokal: VITE_PROXY_TARGET=http://127.0.0.1:8788 npm run dev
        // (default tetap API produksi)
        target: process.env.VITE_PROXY_TARGET || 'https://api.baytmustaqbal.my.id',
        changeOrigin: true,
      },
    },
  },
})