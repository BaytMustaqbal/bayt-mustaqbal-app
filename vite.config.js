import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Waktu build dalam zona WIB (GMT+7), format YYMMDD-HHMM (mis. 261117-1302)
const buildWib = new Date(Date.now() + 7 * 60 * 60 * 1000)
const pad2 = (n) => String(n).padStart(2, '0')
const buildTime = `${String(buildWib.getUTCFullYear()).slice(-2)}${pad2(buildWib.getUTCMonth() + 1)}${pad2(buildWib.getUTCDate())}-${pad2(buildWib.getUTCHours())}${pad2(buildWib.getUTCMinutes())}`

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
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
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