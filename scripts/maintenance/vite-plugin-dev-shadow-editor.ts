/**
 * VITE PLUGIN: Dev Shadow Editor API
 * Exposes development endpoints for saving custom sprite shadow overrides and
 * immediately recompiling static feet and shadow databases into disk.
 */

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { regenerateFeetDatabase } from '../assets/helpers/catalogGenerators.ts';
import type { SpriteShadowOverridesMap } from '../../src/types/pokemon/spriteShadows.ts';

const DEFAULT_FALLBACK_WIDTH_RATIO = 1.0 as const;
const DEFAULT_FALLBACK_HEIGHT_RATIO = 0.28 as const;
const DEFAULT_FALLBACK_PIXELATION = 14 as const;
const HTTP_STATUS_OK = 200 as const;
const HTTP_STATUS_SERVER_ERROR = 500 as const;
const PROGRESS_START_PERCENT = 5 as const;
const PROGRESS_DONE_PERCENT = 100 as const;
const JSON_INDENT_SPACES = 2 as const;

export function devShadowEditorPlugin(): Plugin {
  return {
    name: 'vite-plugin-dev-shadow-editor',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (
          !req.url?.startsWith('/api/dev-save-shadow-overrides') &&
          !req.url?.startsWith('/api/dev-load-shadow-overrides') &&
          !req.url?.startsWith('/api/dev-rebuild-feet-database')
        ) {
          return next();
        }

        const overridesPath = path.resolve(process.cwd(), 'src/data/pokemon/spriteShadowOverrides.json');
        const databaseJsonPath = path.resolve(process.cwd(), 'src/data/pokemon/pokemonFeetDatabase.json');

        if (req.method === 'GET' && req.url?.startsWith('/api/dev-rebuild-feet-database')) {
          res.writeHead(HTTP_STATUS_OK, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          const sendEvent = (progress: number, message: string, done: boolean) => {
            res.write(`data: ${JSON.stringify({ progress, message, done })}\n\n`);
          };

          try {
            sendEvent(PROGRESS_START_PERCENT, 'Iniciando pipeline de recompilación...', false);
            await regenerateFeetDatabase((progress, message) => {
              sendEvent(progress, message, false);
            });
            sendEvent(PROGRESS_DONE_PERCENT, 'Base de datos recompilada con éxito en disco', true);
            res.end();
            server.ws.send({ type: 'full-reload' });
          } catch (err) {
            sendEvent(100, `Error en la recompilación: ${String(err)}`, true);
            res.end();
          }
          return;
        }

        if (req.method === 'GET' && req.url?.startsWith('/api/dev-load-shadow-overrides')) {
          try {
            let overrides: SpriteShadowOverridesMap = {};
            let globalShadowConfig = {
              widthRatio: DEFAULT_FALLBACK_WIDTH_RATIO,
              heightRatio: DEFAULT_FALLBACK_HEIGHT_RATIO,
              pixelation: DEFAULT_FALLBACK_PIXELATION
            };
            try {
              const rawOverrides = await fs.readFile(overridesPath, 'utf8');
              const parsed = JSON.parse(rawOverrides);
              if (parsed && typeof parsed === 'object') {
                if (parsed.globalShadowConfig) {
                  globalShadowConfig = parsed.globalShadowConfig;
                }
                let candidate = parsed.overrides ?? parsed;
                while (candidate && typeof candidate === 'object' && 'overrides' in candidate) {
                  candidate = candidate.overrides;
                }
                overrides = { ...(candidate as SpriteShadowOverridesMap) };
                delete overrides['globalShadowConfig'];
              }
            } catch {
              overrides = {};
            }

            try {
              const rawDb = await fs.readFile(databaseJsonPath, 'utf8');
              const db = JSON.parse(rawDb);
              if (db.shadow) {
                globalShadowConfig = db.shadow;
              }
            } catch {
              // fallback to defaults
            }

            res.writeHead(HTTP_STATUS_OK, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ overrides, globalShadowConfig }));
          } catch {
            res.writeHead(HTTP_STATUS_OK, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              overrides: {},
              globalShadowConfig: {
                widthRatio: DEFAULT_FALLBACK_WIDTH_RATIO,
                heightRatio: DEFAULT_FALLBACK_HEIGHT_RATIO,
                pixelation: DEFAULT_FALLBACK_PIXELATION
              }
            }));
          }
          return;
        }

        if (req.method === 'POST' && req.url?.startsWith('/api/dev-save-shadow-overrides')) {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              let overridesMap = data.overrides ?? data;
              while (overridesMap && typeof overridesMap === 'object' && 'overrides' in overridesMap) {
                overridesMap = overridesMap.overrides;
              }
              const cleanOverrides = { ...overridesMap };
              delete cleanOverrides.globalShadowConfig;
              delete cleanOverrides.overrides;

              const globalShadowConfig = data.globalShadowConfig;

              const payloadToSave = globalShadowConfig
                ? { overrides: cleanOverrides, globalShadowConfig }
                : { overrides: cleanOverrides };
              await fs.writeFile(overridesPath, JSON.stringify(payloadToSave, null, JSON_INDENT_SPACES), 'utf8');

              if (globalShadowConfig) {
                try {
                  const rawDb = await fs.readFile(databaseJsonPath, 'utf8');
                  const db = JSON.parse(rawDb);
                  db.shadow = globalShadowConfig;
                  await fs.writeFile(databaseJsonPath, JSON.stringify(db, null, JSON_INDENT_SPACES), 'utf8');
                } catch (dbErr) {
                  console.error('[vite-plugin-dev-shadow-editor] Error updating pokemonFeetDatabase.json:', dbErr);
                }
              }

              res.writeHead(HTTP_STATUS_OK, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: Object.keys(overridesMap).length }));
            } catch (err) {
              res.writeHead(HTTP_STATUS_SERVER_ERROR, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}
