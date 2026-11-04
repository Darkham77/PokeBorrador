import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

import { vitePrecompressPlugin } from '@francogp/auditor';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { type HmrContext, type Plugin, type PluginOption, type ViteDevServer } from 'vite-plus';
import * as compiler from 'vue/compiler-sfc';

import { generatePokemonDatabase } from './scripts/data/generate_pokemon_db.ts';
import { generateMigrations } from './scripts/database/generate_migrations.ts';
import { devShadowEditorPlugin } from './scripts/maintenance/vite-plugin-dev-shadow-editor.ts';
import { fixPkmnSimPlugin } from './scripts/maintenance/vite-plugin-fix-pkmn-sim.ts';
import { lanPvPPlugin } from './scripts/maintenance/vite-plugin-lan-pvp.ts';
import { sassTrapsFixer } from './scripts/maintenance/vite-plugin-sass-traps.ts';
import { isValidSqliteBuffer } from './src/logic/db/sqliteBufferValidator.ts';

const isVitest = Boolean(process.env.VITEST);

const pkgPath = path.resolve(import.meta.dirname, 'package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
const appVersion = pkgJson.version?.startsWith('v')
  ? pkgJson.version
  : `v${pkgJson.version || '0.6.0'}`;

function versionPlugin(): Plugin {
  return {
    name: 'version-json-writer',
    buildStart(): void {
      try {
        const publicDir = path.resolve(import.meta.dirname, 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        const verPath = path.resolve(publicDir, 'version.json');
        const content = JSON.stringify({ version: appVersion }, null, 2) + '\n';
        if (!fs.existsSync(verPath) || fs.readFileSync(verPath, 'utf-8') !== content) {
          fs.writeFileSync(verPath, content, 'utf-8');
          console.log(`📦 [version] Versión sincronizada en public/version.json: ${appVersion}`);
        }
      } catch (e) {
        console.error('Failed to write version.json:', e);
      }
    }
  };
}

function pokemonDbGeneratorPlugin(): Plugin {
  return {
    name: 'pokemon-db-generator',
    async buildStart(): Promise<void> {
      await generatePokemonDatabase();
    },
    handleHotUpdate({ file }: { file: string }): void {
      if (
        file.includes('src/data/pokemon/speciesMetadata') ||
        file.includes('src/data/battle/moves') ||
        file.includes('src/data/system/constants')
      ) {
        generatePokemonDatabase().catch((err: unknown) => {
          console.error('[PokemonDB Generator] Hot update generation failed:', err);
        });
      }
    }
  };
}

function migrationsPlugin(): Plugin {
  return {
    name: 'migrations-generator',
    async buildStart(): Promise<void> {
      await generateMigrations();
    },
    handleHotUpdate({ file }: { file: string }): void {
      if (file.includes('database/migrations')) {
        generateMigrations().catch((err: unknown) => {
          console.error('[Migrations Generator] Hot update generation failed:', err);
        });
        try {
          const templatePath = path.resolve(
            import.meta.dirname,
            'scratch/database/clean_template.db'
          );
          if (fs.existsSync(templatePath)) {
            fs.unlinkSync(templatePath);
            console.log('🗑️ [DevDB] clean_template.db deleted due to migration update.');
          }
        } catch {
          /* ignore */
        }
      }
    }
  };
}

function devDbImportPlugin(): Plugin {
  return {
    name: 'dev-db-import',
    configureServer(server: ViteDevServer) {
      let cleanDbRamBuffer: Buffer | null = null;
      const simDbRamBuffers = new Map<string, Buffer>();
      const manualImportPath = path.resolve(
        import.meta.dirname,
        'scratch/database/manual_user_backup_import.db'
      );
      const getSimKey = (req: IncomingMessage): string | null => {
        const headerKey = req.headers['x-db-key'];
        const cleanHeaderKey =
          typeof headerKey === 'string'
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
        return path.resolve(
          import.meta.dirname,
          'scratch/database/simulations',
          `${normalizedKey}.db`
        );
      };
      async function handleManualImportRoute(
        req: IncomingMessage,
        res: ServerResponse
      ): Promise<boolean> {
        const url = req.url ?? '';
        if (url.startsWith('/api/dev-manual-import-check')) {
          try {
            await fsPromises.access(manualImportPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: true }));
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: false }));
          }
          return true;
        }
        if (url.startsWith('/api/dev-manual-import-db')) {
          try {
            await fsPromises.access(manualImportPath);
            const binary = await fsPromises.readFile(manualImportPath);
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Cache-Control': 'no-store'
            });
            res.end(binary);
            console.debug('📦 [DevDB] manual_user_backup_import.db sent to client from disk.');
          } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('No manual user backup import found');
          }
          return true;
        }
        if (url.startsWith('/api/dev-manual-import-cleanup')) {
          try {
            await fsPromises.unlink(manualImportPath);
            console.log('📦 [DevDB] manual_user_backup_import.db cleaned up from disk.');
          } catch {
            /* ignore */
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Cleaned up');
          return true;
        }
        return false;
      }
      async function handleSimDbCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
          const existsInRam = simDbRamBuffers.has(simKey);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: existsInRam }));
        }
      }
      async function handleSimDbCleanup(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const simKey = getSimKey(req);
        if (simKey) {
          simDbRamBuffers.delete(simKey);
          const simPath = getSimDbPath(simKey);
          try {
            await fsPromises.unlink(simPath);
            console.log(
              `📦 [DevDB] Simulation ${path.basename(simPath)} cleaned up from RAM & disk.`
            );
          } catch {
            /* ignore */
          }
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Cleaned up');
      }
      async function handleSimDbDownload(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const simKey = getSimKey(req);
        if (!simKey) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Simulation key missing or invalid');
          return;
        }
        const ramBuf = simDbRamBuffers.get(simKey);
        if (ramBuf && isValidSqliteBuffer(ramBuf)) {
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          res.end(ramBuf);
          console.debug('⚡ [DevDB] Simulation sent directly from RAM buffer.');
          return;
        }
        const simPath = getSimDbPath(simKey);
        try {
          await fsPromises.access(simPath);
          const binary = await fsPromises.readFile(simPath);
          if (!isValidSqliteBuffer(binary)) {
            console.warn(`⚠️ [DevDB] Corrupt SQLite DB detected on disk: ${simPath}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Corrupted SQLite database file');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          res.end(binary);
          console.debug(`📦 [DevDB] Simulation ${path.basename(simPath)} sent from disk.`);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Simulation not found');
        }
      }
      function handleSimDbExport(req: IncomingMessage, res: ServerResponse): void {
        let isAborted = false;
        req.on('aborted', () => {
          isAborted = true;
        });
        req.on('close', () => {
          if (!req.complete) isAborted = true;
        });
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk as Buffer));
        req.on('end', async () => {
          if (isAborted || !req.complete) {
            console.warn('⚠️ [DevDB] Simulation upload aborted prematurely by client. Discarding.');
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Upload aborted');
            return;
          }
          const simKey = getSimKey(req);
          if (!simKey) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing or invalid x-db-key header');
            return;
          }
          const buffer = Buffer.concat(chunks);
          const rawLength = req.headers['content-length'];
          const expectedLength = rawLength ? parseInt(rawLength, 10) : undefined;
          if (!isValidSqliteBuffer(buffer, expectedLength)) {
            console.warn(
              `⚠️ [DevDB] Simulation ${simKey} failed SQLite buffer validation (len: ${buffer.length}, expected: ${expectedLength}). Discarding.`
            );
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid SQLite database buffer');
            return;
          }
          simDbRamBuffers.set(simKey, buffer);
          const simPath = getSimDbPath(simKey);
          const tmpPath = `${simPath}.${Math.random().toString(36).substring(2, 8)}.tmp`;
          try {
            await fsPromises.mkdir(path.dirname(simPath), { recursive: true });
            await fsPromises.writeFile(tmpPath, buffer);
            await fsPromises.rename(tmpPath, simPath);
            console.debug(
              `📥 [DevDB] Simulation ${path.basename(simPath)} updated in RAM and disk.`
            );
          } catch {
            await fsPromises.unlink(tmpPath).catch((err: unknown) => {
              console.debug(`[DevDB] Failed to cleanup temp file: ${String(err)}`);
            });
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Saved');
        });
      }
      async function handleSimDbRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        const url = req.url ?? '';
        if (url.startsWith('/api/dev-sim-db-check') || url.startsWith('/api/dev-import-db-check')) {
          await handleSimDbCheck(req, res);
          return true;
        }
        if (
          url.startsWith('/api/dev-sim-db-cleanup') ||
          url.startsWith('/api/dev-import-db-cleanup')
        ) {
          await handleSimDbCleanup(req, res);
          return true;
        }
        if (url.startsWith('/api/dev-sim-db') || url.startsWith('/api/dev-import-db')) {
          await handleSimDbDownload(req, res);
          return true;
        }
        if (url.startsWith('/api/dev-export-db') && req.method === 'POST') {
          handleSimDbExport(req, res);
          return true;
        }
        return false;
      }
      async function handleCleanDbDownload(res: ServerResponse): Promise<void> {
        if (cleanDbRamBuffer) {
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          res.end(cleanDbRamBuffer);
          return;
        }
        const dbPath = path.resolve(import.meta.dirname, 'scratch/database/clean_template.db');
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
      }
      function handleCleanDbExport(req: IncomingMessage, res: ServerResponse): void {
        let isAborted = false;
        req.on('aborted', () => {
          isAborted = true;
        });
        req.on('close', () => {
          if (!req.complete) isAborted = true;
        });
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk as Buffer));
        req.on('end', async () => {
          if (isAborted || !req.complete) {
            console.warn(
              '⚠️ [DevDB] clean_template.db upload aborted prematurely by client. Discarding.'
            );
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Upload aborted');
            return;
          }
          const buffer = Buffer.concat(chunks);
          const rawLength = req.headers['content-length'];
          const expectedLength = rawLength ? parseInt(rawLength, 10) : undefined;
          if (!isValidSqliteBuffer(buffer, expectedLength)) {
            console.warn(
              `⚠️ [DevDB] clean_template.db failed SQLite buffer validation (len: ${buffer.length}). Discarding.`
            );
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid SQLite database buffer');
            return;
          }
          cleanDbRamBuffer = buffer;
          const dbPath = path.resolve(import.meta.dirname, 'scratch/database/clean_template.db');
          const tmpPath = `${dbPath}.${Math.random().toString(36).substring(2, 8)}.tmp`;
          try {
            await fsPromises.mkdir(path.dirname(dbPath), { recursive: true });
            await fsPromises.writeFile(tmpPath, buffer);
            await fsPromises.rename(tmpPath, dbPath);
            console.debug('📥 [DevDB] clean_template.db updated 100% in RAM and synchronized.');
          } catch {
            await fsPromises.unlink(tmpPath).catch((err: unknown) => {
              console.debug(`[DevDB] Failed to cleanup temp file: ${String(err)}`);
            });
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Success');
        });
      }
      async function handleCleanDbRoute(
        req: IncomingMessage,
        res: ServerResponse
      ): Promise<boolean> {
        const url = req.url ?? '';
        if (url.startsWith('/api/dev-clean-db')) {
          await handleCleanDbDownload(res);
          return true;
        }
        if (url.startsWith('/api/dev-export-clean-db') && req.method === 'POST') {
          handleCleanDbExport(req, res);
          return true;
        }
        return false;
      }
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (await handleManualImportRoute(req, res)) return;
          if (await handleSimDbRoute(req, res)) return;
          if (await handleCleanDbRoute(req, res)) return;
          next();
        }
      );
    }
  };
}

const isGithubActions = Boolean(process.env.GITHUB_ACTIONS);
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_URL || (isGithubActions && repoName ? `/${repoName}/` : '/');

const basePlugins: PluginOption[] = [
  fixPkmnSimPlugin(),
  vue({
    compiler,
    template: {
      compilerOptions: {
        hoistStatic: true,
        cacheHandlers: true,
        comments: false
      }
    }
  })
];

if (!isVitest) {
  basePlugins.push(
    lanPvPPlugin(),
    pokemonDbGeneratorPlugin(),
    migrationsPlugin(),
    devDbImportPlugin(),
    devShadowEditorPlugin(),
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
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: [
          '**/*.{html,ico,woff2}',
          '**/index-*.{js,css}',
          '**/vendor-vue-*.js',
          '**/vendor-gsap-*.js'
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(js|css|wasm)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-dynamic-chunks-v1',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /\/assets\/ui\/(events|pokecenter)\/.*\.(png|webp|svg|gif|jpg|jpeg)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-event-banners-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/assets\/sprites\/.*\.(png|webp|svg|gif)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-images-v1',
              expiration: {
                maxEntries: 25000,
                maxAgeSeconds: 60 * 60 * 24 * 90
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/assets\/.*\.(mp3|ogg|wav|mid|midi|m4a|flac|aac)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-audio-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 90
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
    vitePrecompressPlugin(),
    {
      name: 'worker-reload-plugin',
      handleHotUpdate({ file, server }: HmrContext) {
        if (file.endsWith('showdown.worker.ts')) {
          server.config.logger.info(
            `[HMR] showdown.worker.ts modificado. Forzando recarga de página.`
          );
          server.ws.send({ type: 'full-reload' });
          return [];
        }
        return;
      }
    }
  );
}

export const plugins: PluginOption[] = basePlugins;
