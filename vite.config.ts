/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { Temporal } from '@js-temporal/polyfill'


import { generateMigrations } from './scripts/generate_migrations.ts'
import { sassTrapsFixer } from './scripts/vite-plugin-sass-traps.ts'

import { VitePWA } from 'vite-plugin-pwa'

function migrationsPlugin() {
  return {
    name: 'migrations-generator',
    configResolved() {
      generateMigrations()
    },
    handleHotUpdate({ file }: { file: string }) {
      if (file.includes('database/migrations')) {
        generateMigrations()
      }
    }
  }
}

const buildInstant = Temporal.Now.instant().toZonedDateTimeISO('UTC');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    migrationsPlugin(),
    sassTrapsFixer(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['/sql-wasm.wasm', '/assets/fondo/logo%203.webp'],
      manifest: {
        name: 'Poké Vicio',
        short_name: 'PokéVicio',
        description: 'El juego definitivo de Pokémon para navegador',
        theme_color: '#161a2e',
        background_color: '#0a0c14',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/assets/fondo/logo%203.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: '/assets/fondo/logo%203.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Aumentamos el límite de tamaño para assets grandes si los hay
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(buildInstant.year.toString()),
    __APP_VERSION__: JSON.stringify(
      'v' + buildInstant.toString().replace(/[:T-]/g, '.').split('.')[0] + 
      '.' + buildInstant.month.toString().padStart(2, '0') +
      '.' + buildInstant.day.toString().padStart(2, '0') +
      '.' + buildInstant.hour.toString().padStart(2, '0') + 
      buildInstant.minute.toString().padStart(2, '0')
    )
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        charset: true,
        additionalData: `
          @use "@/styles/core/tools" as *;
        `
      }
    }
  },
  server: {
    port: 5173,
    allowedHosts: true,
    host : true,
    /* hmr: {
      clientPort: 443,
    }, */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800, // Reduced limit as Phaser is gone
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-db';
          }
          return;
        }
      }
    }
  },
  esbuild: {
    // Force UTF-8 encoding to preserve non-ASCII characters
    charset: 'utf8',
    // Only drop non-critical logs in production
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
  }
})
