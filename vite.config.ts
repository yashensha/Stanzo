import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Read-only word tools (rhymes, swaps, density) need the recommender worker, which is
  // rarely running locally. Send them to the deployed API unless a local target is set.
  // Everything else (projects, auth, storage) stays on the local API so dev never writes to prod.
  const wordToolsTarget = env.WORD_TOOLS_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:5001'
  const wordToolsProxy = { target: wordToolsTarget, changeOrigin: true }

  // `vite build --mode capacitor` produces the bundle for the native shell. The page origin
  // there is https://localhost, so relative /api calls are rewritten to the deployed Worker
  // (see src/utils/nativeApiBase.ts) and the service worker is left out.
  const isNative = mode === 'capacitor'
  const workerBase = env.VITE_API_BASE || env.VITE_API_URL || 'https://songwriting-api.m-yashensha.workers.dev'
  const nativeApiBase = isNative ? workerBase : ''
  // Collaboration sockets go straight to the Worker in every build (Pages doesn't proxy
  // WebSockets). The dev server leaves it empty and uses its own /ws proxy.
  const collabWsUrl = command === 'build' ? `${workerBase.replace(/^http/, 'ws')}/ws` : ''

  return {
  envPrefix: ['VITE_'],
  // Native and web bundles must never share a folder: the native one points /api at the
  // Worker and has no service worker, so deploying it to Pages would break the web app.
  build: {
    outDir: isNative ? 'dist-native' : 'dist',
  },
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify(nativeApiBase),
    'import.meta.env.VITE_COLLAB_WS_URL': JSON.stringify(collabWsUrl),
  },
  plugins: [
    react(),
    VitePWA({
      disable: isNative,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: "Stanza — Songwriter's Notepad",
        short_name: 'Stanza',
        description: "A songwriter's notepad for drafting lyrics and recording audio memos",
        theme_color: '#FBFAF8',
        background_color: '#FBFAF8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-cache',
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api/rhyme': wordToolsProxy,
      '/api/synonyms': wordToolsProxy,
      '/api/phonetic-swap': wordToolsProxy,
      '/api/semantic-search': wordToolsProxy,
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5001',
        ws: true,
        changeOrigin: true,
      }
    }
  }
  }
})
