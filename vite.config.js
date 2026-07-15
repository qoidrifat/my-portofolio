import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,webp,png,jpg,svg,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: "Qoid Rif'at — AI & Web Developer Portfolio",
        short_name: 'Qoid Rif\'at',
        description: "Qoid Rif'at — AI & Web Developer from Surabaya, Indonesia. Building intelligent web experiences.",
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only split truly independent, large libraries to avoid
          // TDZ errors from interdependent vendor modules.
          // React Router v7, React, Radix, etc. are best left to
          // Vite/Rollup's natural chunking to ensure correct ordering.
          if (id.includes('node_modules')) {
            // Icon libraries are standalone (no internal deps on other node_modules)
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
            // framer-motion is standalone
            if (id.includes('framer-motion')) return 'vendor-framer';
            // Let everything else chunk naturally via Vite/Rollup defaults
          }
        },
      },
    },
  },
})
