/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// On GitHub Pages the app lives under /my-day-ai/ (the deploy workflow sets VITE_BASE). Locally it is '/'.
const base = process.env.VITE_BASE ?? '/'
// the version shown in the settings comes from package.json
const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // a new version is downloaded in the background, the app shows "New update" and restarts when the user agrees
      registerType: 'prompt',
      // our own service worker (src/sw.ts): the same offline cache, plus what a generated one cannot
      // do: a tap on a notification opens the app, and buttons inside a notification
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'My Day AI',
        short_name: 'My Day',
        description: 'A daily planner for students',
        // the same dark colour as the app background: no blue bars, dark splash screen
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: base,
        lang: 'en',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      injectManifest: {
        // the icons are needed offline too (notifications, the install screen); the big iPhone start
        // screens are not
        globPatterns: ['**/*.{js,css,html,svg}', '*.png'],
      },
    }),
  ],
  test: {
    // the virtual module of vite-plugin-pwa does not exist in tests
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./src/test/pwa-register.ts', import.meta.url)),
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['src/lib/**/*.test.ts'],
    },
  },
})
