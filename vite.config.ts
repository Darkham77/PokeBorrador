import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

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
    __BUILD_TIME__: JSON.stringify(Temporal.Now.instant().toZonedDateTimeISO('UTC').year.toString()),
    __APP_VERSION__: JSON.stringify(
      'v' + Temporal.Now.instant().toZonedDateTimeISO('UTC').toString().replace(/[:T-]/g, '.').split('.')[0] + 
      '.' + Temporal.Now.instant().toZonedDateTimeISO('UTC').month.toString().padStart(2, '0') +
      '.' + Temporal.Now.instant().toZonedDateTimeISO('UTC').day.toString().padStart(2, '0') +
      '.' + Temporal.Now.instant().toZonedDateTimeISO('UTC').hour.toString().padStart(2, '0') + 
      Temporal.Now.instant().toZonedDateTimeISO('UTC').minute.toString().padStart(2, '0')
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
        }
      }
    }
  },
  esbuild: {
    // Only drop non-critical logs in production
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
  }
})
