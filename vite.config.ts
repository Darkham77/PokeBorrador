/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { Temporal } from '@js-temporal/polyfill'
import type { IncomingMessage, ServerResponse } from 'node:http'


import { generateMigrations } from './scripts/generate_migrations.ts'
import { sassTrapsFixer } from './scripts/vite-plugin-sass-traps.ts'

import { VitePWA } from 'vite-plugin-pwa'

import fsPromises from 'node:fs/promises'
import fs from 'node:fs'

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

function devDbImportPlugin() {
  return {
    name: 'dev-db-import',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.startsWith('/api/dev-import-db-check')) {
          const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
          try {
            await fsPromises.access(dbPath)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ exists: true }))
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ exists: false }))
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-import-db-cleanup')) {
          const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
          try {
            await fsPromises.unlink(dbPath)
            console.log(' Gazelle [DevDB] Temporary imported.db cleaned up.')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Cleaned up')
          } catch {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Already cleaned up')
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-import-db')) {
          const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
          try {
            await fsPromises.access(dbPath)
            const binary = await fsPromises.readFile(dbPath)
            
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            })
            res.end(binary)
            console.log('📦 [DevDB] Temporary imported.db sent to client.')
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('No imported database found')
          }
          return;
        }
        next()
      })
    }
  }
}

// Leer timezone desde .env
const getEnvTimezone = (): string => {
  try {
    const envPath = path.resolve(__dirname, '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/^VITE_TIMEZONE\s*=\s*(.+)$/m)
    if (match && match[1]) {
      return match[1].trim()
    }
  } catch (_e) {
    // Fallback si hay algún problema
  }
  return 'UTC'
}

const buildInstant = Temporal.Now.instant().toZonedDateTimeISO(getEnvTimezone());

// Detect if building on GitHub Actions for GitHub Pages
const isGithubActions = !!process.env.GITHUB_ACTIONS
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.VITE_BASE_URL || (isGithubActions && repoName ? `/${repoName}/` : '/')

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    migrationsPlugin(),
    devDbImportPlugin(),
    sassTrapsFixer(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['sql-wasm.wasm', 'assets/fondo/logo%203.webp'],
      manifest: {
        name: 'Poké Vicio',
        short_name: 'PokéVicio',
        description: 'El juego definitivo de Pokémon para navegador',
        theme_color: '#161a2e',
        background_color: '#0a0c14',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'assets/fondo/logo%203.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: 'assets/fondo/logo%203.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Aumentamos el límite de tamaño para assets grandes si los hay (e.g. ShowdownWorker)
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
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
        bypass: (req) => {
          if (req.url?.startsWith('/api/dev-import-db')) {
            return req.url
          }
          return undefined
        }
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increased to 1000 to accommodate game database size
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-db';
          }
          if (id.includes('node_modules/gsap')) {
            return 'vendor-gsap';
          }
          if (id.includes('node_modules/@js-temporal')) {
            return 'vendor-temporal';
          }
          if (id.includes('src/data/')) {
            return 'game-data';
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
