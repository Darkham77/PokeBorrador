import { defineConfig } from 'vite'
import { type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'


import { generateMigrations } from './scripts/database/generate_migrations.ts'
import { sassTrapsFixer } from './scripts/maintenance/vite-plugin-sass-traps.ts'

import { VitePWA } from 'vite-plugin-pwa'

import fsPromises from 'node:fs/promises'
import fs from 'node:fs'

import type { ESBuildOptions } from 'vite'

type ESBuildOptionsWithCharset = ESBuildOptions & { charset?: 'utf8' }
const esbuildConfig: ESBuildOptionsWithCharset = {
  charset: 'utf8',
  drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
  pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
}

function migrationsPlugin() {
  return {
    name: 'migrations-generator',
    async buildStart() {
      await generateMigrations()
      try {
        const templatePath = path.resolve(__dirname, 'database/temp/clean_template.db')
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath)
          console.log('🗑️ [DevDB] clean_template.db cleaned up at build start.')
        }
      } catch (_e) { /* ignore */ }
    },
    handleHotUpdate({ file }: { file: string }) {
      if (file.includes('database/migrations')) {
        generateMigrations().catch(err => {
          console.error('[Migrations Generator] Hot update generation failed:', err)
        })
        try {
          const templatePath = path.resolve(__dirname, 'database/temp/clean_template.db')
          if (fs.existsSync(templatePath)) {
            fs.unlinkSync(templatePath)
            console.log('🗑️ [DevDB] clean_template.db deleted due to migration update.')
          }
        } catch (_e) { /* ignore */ }
      }
    }
  }
}

function devDbImportPlugin() {
  return {
    name: 'dev-db-import',
    configureServer(server: ViteDevServer) {
      let cleanDbRamBuffer: Buffer | null = null;
      let importedDbRamBuffer: Buffer | null = null;

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.startsWith('/api/dev-import-db-check')) {
          if (importedDbRamBuffer) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ exists: true }))
            return;
          }
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
          importedDbRamBuffer = null;
          const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
          try {
            await fsPromises.unlink(dbPath)
            console.log(' 📦 [DevDB] Temporary imported.db cleaned up from RAM & disk.')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Cleaned up')
          } catch {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Already cleaned up')
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-import-db')) {
          if (importedDbRamBuffer) {
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            })
            res.end(importedDbRamBuffer)
            console.debug('📦 [DevDB] Temporary imported.db sent to client from RAM memory.')
            return;
          }
          const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
          try {
            await fsPromises.access(dbPath)
            const binary = await fsPromises.readFile(dbPath)
            importedDbRamBuffer = binary;
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            })
            res.end(binary)
            console.debug('📦 [DevDB] Temporary imported.db sent to client from RAM.')
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('No imported database found')
          }
          return;
        }
        if (req.url?.startsWith('/api/dev-export-db') && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', chunk => chunks.push(chunk as Buffer))
          req.on('end', async () => {
            const buffer = Buffer.concat(chunks)
            importedDbRamBuffer = buffer; // Store 100% in RAM memory
            const dbPath = path.resolve(__dirname, 'database/temp/imported.db')
            const tmpPath = `${dbPath}.${Math.random().toString(36).substring(2, 8)}.tmp`
            try {
              await fsPromises.mkdir(path.dirname(dbPath), { recursive: true })
              await fsPromises.writeFile(tmpPath, buffer)
              await fsPromises.rename(tmpPath, dbPath)
              console.debug('📥 [DevDB] Temporary imported.db updated 100% in RAM and atomic file sync.')
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end('Saved')
            } catch (_err: unknown) {
              await fsPromises.unlink(tmpPath).catch(() => {})
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end('Saved')
            }
          })
          return;
        }

        if (req.url?.startsWith('/api/dev-clean-db')) {
          if (cleanDbRamBuffer) {
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            })
            res.end(cleanDbRamBuffer)
            return;
          }
          const dbPath = path.resolve(__dirname, 'database/temp/clean_template.db')
          try {
            await fsPromises.access(dbPath)
            const binary = await fsPromises.readFile(dbPath)
            cleanDbRamBuffer = binary;
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            })
            res.end(binary)
            console.debug('📦 [DevDB] Temporary clean_template.db sent to client from RAM.')
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('No clean template database found')
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-export-clean-db') && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', chunk => chunks.push(chunk as Buffer))
          req.on('end', async () => {
            const buffer = Buffer.concat(chunks)
            cleanDbRamBuffer = buffer; // Store 100% in RAM memory
            const dbPath = path.resolve(__dirname, 'database/temp/clean_template.db')
            const tmpPath = `${dbPath}.${Math.random().toString(36).substring(2, 8)}.tmp`
            try {
              await fsPromises.mkdir(path.dirname(dbPath), { recursive: true })
              await fsPromises.writeFile(tmpPath, buffer)
              await fsPromises.rename(tmpPath, dbPath)
              console.debug('📥 [DevDB] clean_template.db updated 100% in RAM and synchronized.')
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end('Success')
            } catch (_err: unknown) {
              await fsPromises.unlink(tmpPath).catch(() => {})
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end('Success')
            }
          })
          return;
        }

        next()
      })
    }
  }
}


// ─── Version System ───────────────────────────────────────────────────────────
// The developer's LOCAL build is the single source of truth for the version.
// CI (GitHub Actions) MUST use the already-committed version.json, never
// recalculate it, so that the deployed web app and the DB always match.

const isCI = !!process.env.GITHUB_ACTIONS;

/** Read the version already committed to public/version.json (used in CI). */
function readCommittedVersion(): string {
  try {
    const verPath = path.resolve(__dirname, 'public', 'version.json');
    const parsed: unknown = JSON.parse(fs.readFileSync(verPath, 'utf-8'));
    if (parsed && typeof parsed === 'object' && 'version' in parsed && typeof (parsed as Record<string, unknown>).version === 'string') {
      return (parsed as { version: string }).version;
    }
  } catch (_e) {
    // Silently ignore — fallback below
  }
  return '';
}

/** Compute a fresh version from current local time (used for local builds). */
function computeLocalVersion(): string {
  let tz = 'UTC';
  if (process.env.VITE_TIMEZONE) tz = process.env.VITE_TIMEZONE;
  else if (process.env.TZ) tz = process.env.TZ;
  else {
    try {
      const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf-8');
      const m = envContent.match(/^VITE_TIMEZONE\s*=\s*(.+)$/m);
      if (m?.[1]) tz = m[1].trim();
    } catch (_e) {
      // Silently ignore
    }
  }
  const now = Temporal.Now.instant().toZonedDateTimeISO(tz);
  return 'v' + now.year.toString() +
    '.' + now.month.toString().padStart(2, '0') +
    '.' + now.day.toString().padStart(2, '0') +
    '.' + now.hour.toString().padStart(2, '0') +
    now.minute.toString().padStart(2, '0');
}

// In CI: reuse the committed version. Locally: compute from current time.
const appVersion: string = isCI
  ? (readCommittedVersion() || computeLocalVersion())
  : computeLocalVersion();

/**
 * Plugin que gestiona public/version.json:
 * - LOCAL: escribe la versión recién calculada (fuente de verdad para el commit).
 * - CI:    NO toca version.json; usa el ya commiteado por el desarrollador.
 */
function versionPlugin() {
  return {
    name: 'version-json-writer',
    buildStart() {
      if (isCI) {
        console.log(`📦 [version] CI build — usando versión commiteada: ${appVersion}`);
        return;
      }
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(
          path.resolve(publicDir, 'version.json'),
          JSON.stringify({ version: appVersion }, null, 2)
        );
        console.log(`📦 [version] Build local — versión registrada: ${appVersion}`);
      } catch (e) {
        console.error('Failed to write version.json:', e);
      }
    }
  }
}

// Detect if building on GitHub Actions for GitHub Pages
const isGithubActions = !!process.env.GITHUB_ACTIONS
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.VITE_BASE_URL || (isGithubActions && repoName ? `/${repoName}/` : '/')

function fixPkmnSimPlugin() {
  return {
    name: 'fix-pkmn-sim',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('@pkmn/sim') || id.includes('@pkmn/sets') || id.includes('pkmn_sim.js')) {
        if (code.includes('static import(') || code.includes('static import (')) {
          return {
            code: code.replace(/static import\s*\(/g, 'static "import"('),
            map: null
          };
        }
      }
      return null;
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    fixPkmnSimPlugin(),
    vue(),
    migrationsPlugin(),
    devDbImportPlugin(),
    sassTrapsFixer(),
    versionPlugin(),
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
        skipWaiting: false,
        clientsClaim: true,
        // CRITICAL: Only precache app shell (JS, CSS, HTML, fonts, wasm).
        // NEVER precache game sprites/images or audio here — there are ~20k
        // image files in public/assets/. Precaching them all would block SW
        // installation indefinitely and cause an infinite update loop.
        globPatterns: ['**/*.{js,css,html,ico,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Game images and audio are cached on-demand via runtime caching.
        // First access downloads and caches; subsequent accesses serve from
        // cache instantly. This avoids blocking SW installation.
        runtimeCaching: [
          {
            // All game image assets (sprites, icons, backgrounds)
            urlPattern: /\/assets\/.*\.(png|webp|svg|gif|jpg|jpeg)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-images-v1',
              expiration: {
                maxEntries: 25000,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // All game audio assets (music tracks, SFX files: mp3, ogg, wav, midi, m4a, flac, aac)
            urlPattern: /\/assets\/.*\.(mp3|ogg|wav|mid|midi|m4a|flac|aac)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-audio-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    }),
    {
      name: 'worker-reload-plugin',
      handleHotUpdate({ file, server }) {
        if (file.endsWith('showdown.worker.ts')) {
          server.config.logger.info(`[HMR] showdown.worker.ts modificado. Forzando recarga de página.`);
          server.ws.send({ type: 'full-reload' });
          return [];
        }
        return;
      }
    }
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(appVersion.slice(1, 5)),
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    entries: [
      'index.html',
      'src/**/*.{ts,tsx,vue,js,jsx}'
    ]
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
    watch: {
      ignored: ['**/_raw-assets/**', '**/sprite_test/**', '**/database/temp/**', '**/database/backups/**', '**/scratch/**']
    },
    /* hmr: {
      clientPort: 443,
    }, */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.url?.includes('/api/dev-')) {
            return req.url
          }
          return undefined
        }
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 9000, // accommodate game-data (pokemonDB + Showdown stats/dex)
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id?.includes('node_modules')) {
          return;
        }
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/gsap')) {
            return 'vendor-gsap';
          }
          if (id.includes('src/data/')) {
            return 'game-data';
          }
          return;
        }
      }
    }
  },
  esbuild: esbuildConfig,
})
