import { defineConfig } from 'vite'
import { type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'


import { generateMigrations } from './scripts/database/generate_migrations.ts'
import { generatePokemonDatabase } from './scripts/data/generate_pokemon_db.ts'
import { sassTrapsFixer } from './scripts/maintenance/vite-plugin-sass-traps.ts'
import { staticPrecompressPlugin } from './scripts/maintenance/vite-plugin-precompress.ts'

import { VitePWA } from 'vite-plugin-pwa'

import fsPromises from 'node:fs/promises'
import fs from 'node:fs'

import type { ESBuildOptions } from 'vite'

type ESBuildOptionsWithCharset = ESBuildOptions & { charset?: 'utf8' }
const esbuildConfig: ESBuildOptionsWithCharset = {
  charset: 'utf8',
  legalComments: 'none',
  treeShaking: true,
  drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
  pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
}

function pokemonDbGeneratorPlugin() {
  return {
    name: 'pokemon-db-generator',
    async buildStart() {
      await generatePokemonDatabase()
    },
    handleHotUpdate({ file }: { file: string }) {
      if (file.includes('src/data/pokemon/speciesMetadata') || file.includes('src/data/battle/moves') || file.includes('src/data/system/constants')) {
        generatePokemonDatabase().catch(err => {
          console.error('[PokemonDB Generator] Hot update generation failed:', err)
        })
      }
    }
  }
}

function migrationsPlugin() {
  return {
    name: 'migrations-generator',
    async buildStart() {
      await generateMigrations()
    },
    handleHotUpdate({ file }: { file: string }) {
      if (file.includes('database/migrations')) {
        generateMigrations().catch(err => {
          console.error('[Migrations Generator] Hot update generation failed:', err)
        })
        try {
          const templatePath = path.resolve(import.meta.dirname, 'database/temp/clean_template.db')
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
      const simDbRamBuffers = new Map<string, Buffer>();

      const manualImportPath = path.resolve(import.meta.dirname, 'database/temp/manual_user_backup_import.db');

      const getSimKey = (req: IncomingMessage): string | null => {
        const headerKey = req.headers['x-db-key'];
        const cleanHeaderKey = typeof headerKey === 'string'
          ? headerKey.replace(/[^a-zA-Z0-9_-]/g, '')
          : Array.isArray(headerKey) && headerKey[0]
            ? headerKey[0].replace(/[^a-zA-Z0-9_-]/g, '')
            : '';
        if (cleanHeaderKey && cleanHeaderKey.startsWith('sim_')) return cleanHeaderKey;

        if (!req.url) return null;
        try {
          const parsed = new URL(req.url, 'http://localhost');
          const key = parsed.searchParams.get('db_key');
          return key && key.startsWith('sim_') && /^[a-zA-Z0-9_-]+$/.test(key) ? key : null;
        } catch {
          return null;
        }
      };

      const getSimDbPath = (simKey: string): string => {
        const normalizedKey = simKey.startsWith('sim_') ? simKey : `sim_${simKey}`;
        return path.resolve(import.meta.dirname, 'database/temp/simulations', `${normalizedKey}.db`);
      };

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        // --- 1. Dedicated Manual User Backup Import Channel ---
        if (req.url?.startsWith('/api/dev-manual-import-check')) {
          try {
            await fsPromises.access(manualImportPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: true }));
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: false }));
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-manual-import-db')) {
          try {
            await fsPromises.access(manualImportPath);
            const binary = await fsPromises.readFile(manualImportPath);
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            });
            res.end(binary);
            console.debug('📦 [DevDB] manual_user_backup_import.db sent to client from disk.');
            return;
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('No manual user backup import found');
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-manual-import-cleanup')) {
          try {
            await fsPromises.unlink(manualImportPath);
            console.log('📦 [DevDB] manual_user_backup_import.db cleaned up from disk.');
          } catch { /* ignore */ }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Cleaned up');
          return;
        }

        // --- 2. Isolated Simulation & Tests Channel ---
        if (req.url?.startsWith('/api/dev-sim-db-check') || req.url?.startsWith('/api/dev-import-db-check')) {
          const simKey = getSimKey(req);
          if (!simKey) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: false }));
            return;
          }
          const simPath = getSimDbPath(simKey);
          try {
            await fsPromises.access(simPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: true }));
          } catch {
            if (simDbRamBuffers.has(simKey)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ exists: true }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: false }));
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-sim-db-cleanup') || req.url?.startsWith('/api/dev-import-db-cleanup')) {
          const simKey = getSimKey(req);
          if (simKey) {
            simDbRamBuffers.delete(simKey);
            const simPath = getSimDbPath(simKey);
            try {
              await fsPromises.unlink(simPath);
              console.log(`📦 [DevDB] Simulation ${path.basename(simPath)} cleaned up from RAM & disk.`);
            } catch { /* ignore */ }
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Cleaned up');
          return;
        }

        if (req.url?.startsWith('/api/dev-sim-db') || req.url?.startsWith('/api/dev-import-db')) {
          const simKey = getSimKey(req);
          if (!simKey) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Simulation key missing or invalid');
            return;
          }
          const simPath = getSimDbPath(simKey);
          try {
            await fsPromises.access(simPath);
            const binary = await fsPromises.readFile(simPath);
            simDbRamBuffers.delete(simKey);
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            });
            res.end(binary);
            console.debug(`📦 [DevDB] Simulation ${path.basename(simPath)} sent to client from disk.`);
            return;
          } catch {
            const ramBuf = simDbRamBuffers.get(simKey);
            if (ramBuf) {
              res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'no-store'
              });
              res.end(ramBuf);
              console.debug(`📦 [DevDB] Simulation ${simKey} sent to client from RAM memory.`);
              return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('No simulation database found');
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-export-db') && req.method === 'POST') {
          const simKey = getSimKey(req);
          if (!simKey) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Simulation key required with sim_ prefix');
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(chunk as Buffer));
          req.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            simDbRamBuffers.set(simKey, buffer);
            const simPath = getSimDbPath(simKey);
            const tmpPath = `${simPath}.${Math.random().toString(36).substring(2, 8)}.tmp`;
            try {
              await fsPromises.mkdir(path.dirname(simPath), { recursive: true });
              await fsPromises.writeFile(tmpPath, buffer);
              await fsPromises.rename(tmpPath, simPath);
              console.debug(`📥 [DevDB] Simulation ${path.basename(simPath)} updated in RAM and disk.`);
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Saved');
            } catch (_err: unknown) {
              await fsPromises.unlink(tmpPath).catch(() => {});
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Saved');
            }
          });
          return;
        }

        // --- 3. Clean Template Channel (Instant E2E / In-Memory Bootstrap) ---
        if (req.url?.startsWith('/api/dev-clean-db')) {
          if (cleanDbRamBuffer) {
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            });
            res.end(cleanDbRamBuffer);
            return;
          }
          const dbPath = path.resolve(import.meta.dirname, 'database/temp/clean_template.db');
          try {
            await fsPromises.access(dbPath);
            const binary = await fsPromises.readFile(dbPath);
            cleanDbRamBuffer = binary;
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            });
            res.end(binary);
            console.debug('📦 [DevDB] Temporary clean_template.db sent to client from RAM.');
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('No clean template database found');
          }
          return;
        }

        if (req.url?.startsWith('/api/dev-export-clean-db') && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(chunk as Buffer));
          req.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            cleanDbRamBuffer = buffer; // Store 100% in RAM memory
            const dbPath = path.resolve(import.meta.dirname, 'database/temp/clean_template.db');
            const tmpPath = `${dbPath}.${Math.random().toString(36).substring(2, 8)}.tmp`;
            try {
              await fsPromises.mkdir(path.dirname(dbPath), { recursive: true });
              await fsPromises.writeFile(tmpPath, buffer);
              await fsPromises.rename(tmpPath, dbPath);
              console.debug('📥 [DevDB] clean_template.db updated 100% in RAM and synchronized.');
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Success');
            } catch (_err: unknown) {
              await fsPromises.unlink(tmpPath).catch(() => {});
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Success');
            }
          });
          return;
        }

        next();
      });
    }
  };
}


// ─── Version System ───────────────────────────────────────────────────────────
// The developer's LOCAL build is the single source of truth for the version.
// CI (GitHub Actions) MUST use the already-committed version.json, never
// recalculate it, so that the deployed web app and the DB always match.

const isCI = !!process.env.GITHUB_ACTIONS;

/** Read the version already committed to public/version.json (used in CI). */
function readCommittedVersion(): string {
  try {
    const verPath = path.resolve(import.meta.dirname, 'public', 'version.json');
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
      const envContent = fs.readFileSync(path.resolve(import.meta.dirname, '.env'), 'utf-8');
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
        const publicDir = path.resolve(import.meta.dirname, 'public');
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
    pokemonDbGeneratorPlugin(),
    vue({
      template: {
        compilerOptions: {
          hoistStatic: true,
          cacheHandlers: true,
          comments: false
        }
      }
    }),
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
        // CRITICAL: Precache ONLY the essential App Shell (< 500 KB).
        // Heavy data chunks, optional views, and dynamic engines are cached on-demand via runtime caching.
        globPatterns: [
          '**/*.{html,ico,woff2}',
          '**/index-*.{js,css}',
          '**/vendor-vue-*.js',
          '**/vendor-gsap-*.js'
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Dynamic code chunks & wasm modules (game data, modals, subviews, sqlite)
            urlPattern: /\/assets\/.*\.(js|css|wasm)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-dynamic-chunks-v1',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Dynamic event and PokeCenter UI banners (updated in background via StaleWhileRevalidate)
            urlPattern: /\/assets\/ui\/(events|pokecenter)\/.*\.(png|webp|svg|gif|jpg|jpeg)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-event-banners-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
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
    staticPrecompressPlugin(),
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
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      fixPkmnSimPlugin(),
    ],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@pkmn/sim') || id.includes('node_modules/@pkmn/sets') || id.includes('pkmn_sim.js')) {
            return 'worker-vendor-pkmn-sim';
          }
          if (id.includes('src/data/pokemon/')) {
            return 'worker-game-data-pokemon';
          }
          if (id.includes('src/data/battle/')) {
            return 'worker-game-data-battle';
          }
          return undefined;
        }
      }
    }
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
    target: 'esnext',
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false
    },
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: 'no-external',
        annotations: true,
        manualPureFunctions: ['console.log', 'console.info', 'console.debug']
      },
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
          if (id.includes('node_modules/@pkmn/randoms')) {
            return 'vendor-randoms';
          }
          if (id.includes('node_modules/sql.js')) {
            return 'vendor-sqljs';
          }
          if (id.includes('node_modules/valibot')) {
            return 'vendor-valibot';
          }
          if (id.includes('src/data/pokemon/pokemonFeetDatabase') || id.includes('src/data/pokemon/feetCoordinatesData')) {
            return 'game-data-feet';
          }
          if (id.includes('src/data/pokemon/animatedSpriteDatabase') || id.includes('src/data/pokemon/animatedSpriteData')) {
            return 'game-data-sprites';
          }
          if (id.includes('src/data/pokemon/')) {
            return 'game-data-pokemon';
          }
          if (id.includes('src/data/battle/')) {
            return 'game-data-battle';
          }
          if (id.includes('src/data/inventory/')) {
            return 'game-data-items';
          }
          if (id.includes('src/data/world/') || id.includes('src/data/weather/')) {
            return 'game-data-world';
          }
          if (id.includes('src/data/player/') || id.includes('src/data/system/') || id.includes('src/data/ai/')) {
            return 'game-data-system';
          }
          return;
        }
      }
    }
  },
  esbuild: esbuildConfig,
})
