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
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}', 'icon*.{png,webp}', 'profile.{webp,avif}', 'logo.webp'],
        // Keep precache lean: screenshots, case study assets, and gallery images
        // are loaded on-demand and cached via runtimeCaching.
        globIgnores: ['gallery/**', 'projects/**', 'arsip/**', '**/*.pdf', 'fonts/inter/Inter-normal-{500,600,900}.woff2'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
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
          {
            urlPattern: /\/(projects|gallery)\/.*\.(webp|avif|jpg|png)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'portfolio-media',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/fonts\/.*\.woff2$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'portfolio-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts}'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Standalone libraries — safe to split without TDZ risk
          if (id.includes('node_modules')) {
            // @tanstack/react-query is standalone (no internal circular deps)
            if (id.includes('@tanstack')) return 'vendor-query';
            // framer-motion is standalone
            if (id.includes('framer-motion')) return 'vendor-framer';
            // Icon libraries — standalone, no internal deps
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
            // react-router-dom v7 pulls the whole router runtime into the entry
            // chunk when left unsplit (+26 KB raw / +9 KB gzip on the LCP path).
            if (id.includes('react-router')) return 'vendor-router';
          }
        },
      },
    },
  },
})
