/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'icons/*.png', 'reminder-sw.js'],
      manifest: {
        name: 'Lampstand',
        short_name: 'Lampstand',
        description:
          'Daily Bible reading, faith-building plans, reflections and Scripture presentations.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F5F2EA',
        theme_color: '#FFFFFF',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell, fonts, icons, Bible data and the background library all work offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,json}'],
        // Study notes (8 MB) download a book at a time when first opened, then work offline.
        globIgnores: ['notes/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/notes/'),
            handler: 'CacheFirst',
            options: { cacheName: 'study-notes', expiration: { maxEntries: 80 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Scene compositions load in an iframe as themselves, never as the app shell.
        navigateFallbackDenylist: [/^\/scenes\//],
        cleanupOutdatedCaches: true,
        // Reading reminders: Android's background check and opening the app from a reminder.
        importScripts: ['reminder-sw.js'],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The app is precached and served locally (offline), so a larger first chunk costs ~65 ms.
  build: { chunkSizeWarningLimit: 800 },
  server: { port: 5310, strictPort: true, watch: { usePolling: true, interval: 500 } },
  preview: { port: 4173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
