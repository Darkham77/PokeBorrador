/**
 * @file supabaseClient.ts
 * @description Helper compartido para leer el archivo .env maestro, parsear perfiles de servidor
 * y generar URLs de conexión de PostgreSQL consistentes entre scripts de administración.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';

const ENV_FILE = path.resolve(process.cwd(), '.env');
const DEFAULT_POSTGRES_PORT_TEXT = '5432';

export interface ServerConfig {
  SUPABASE_PUBLIC_URL?: string;
  API_EXTERNAL_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SERVICE_ROLE_KEY?: string;
  POSTGRES_PASSWORD?: string;
  SECRET_KEY_BASE?: string;
  DASHBOARD_USERNAME?: string;
  DASHBOARD_PASSWORD?: string;
  KONG_HTTPS_PORT?: string;
  PG_META_CRYPTO_KEY?: string;
  VAULT_ENC_KEY?: string;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  SUPABASE_URL?: string;
  TENANT_ID?: string;
  IS_DEFAULT?: string;
  ANON_KEY?: string;
  SITE_URL?: string;
  REGION?: string;
  NAME?: string;
  KEY?: string;
  URL?: string;
  ID?: string;
  POSTGRES_PORT?: string;
  DB_PORT?: string;
  DB_PASSWORD?: string;
  POSTGRES_URL?: string;
  PG_URL?: string;
  [key: string]: string | undefined;
}

export async function readAndParseEnv(): Promise<Record<string, ServerConfig>> {
  try {
    await fsPromises.access(ENV_FILE);
  } catch {
    console.error(styleText('red', '❌ Error: Archivo .env maestro no encontrado.'));
    process.exit(1);
  }

  let envContent = '';
  try {
    // Uso de Explicit Resource Management (await using) para la lectura del .env
    await using fileHandle = await fsPromises.open(ENV_FILE, 'r');
    envContent = await fileHandle.readFile({ encoding: 'utf-8' });
  } catch (e: unknown) {
    console.error(styleText('red', `❌ Error al leer el archivo .env: ${(e as Error).message}`));
    process.exit(1);
  }

  const lines = envContent.split('\n');
  const serverConfigs: Record<string, ServerConfig> = {};

  const KNOWN_SUFFIXES = [ // no-domain: Non-domain utility collection or data structure
    'SUPABASE_PUBLIC_URL', 'API_EXTERNAL_URL', 'SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY', 'POSTGRES_PASSWORD', 'SECRET_KEY_BASE',
    'DASHBOARD_USERNAME', 'DASHBOARD_PASSWORD', 'KONG_HTTPS_PORT',
    'PG_META_CRYPTO_KEY', 'VAULT_ENC_KEY', 'DATABASE_URL',
    'JWT_SECRET', 'SUPABASE_URL', 'TENANT_ID', 'IS_DEFAULT',
    'ANON_KEY', 'SITE_URL', 'REGION', 'NAME', 'KEY', 'URL', 'ID',
    'POSTGRES_PORT', 'DB_PORT', 'DB_PASSWORD', 'POSTGRES_URL', 'PG_URL'
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      const fullKey = match[1].trim();
      let value = match[2].trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (fullKey.startsWith('SERVER_')) {
        const withoutPrefix = fullKey.slice('SERVER_'.length);
        const matchedSuffix = KNOWN_SUFFIXES.find(s => withoutPrefix.endsWith(`_${s}`));
        if (matchedSuffix === undefined) continue;

        const profile = withoutPrefix.slice(0, withoutPrefix.length - matchedSuffix.length - 1);
        if (!profile) continue;

        const cleanKey = matchedSuffix;
        if (!serverConfigs[profile]) {
          serverConfigs[profile] = {};
        }
        const targetConf = serverConfigs[profile];
        if (targetConf) {
          targetConf[cleanKey] = value;
        }
      }
    }
  }

  return serverConfigs;
}

export function buildDatabaseUrl(conf: ServerConfig, canonicalName: string): string {
  let dbUrl = conf.DATABASE_URL || conf.POSTGRES_URL || conf.PG_URL || '';
  if (!dbUrl) {
    const pass = conf.POSTGRES_PASSWORD || conf.DB_PASSWORD || '';
    const rawPubUrl = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
    if (rawPubUrl && pass) {
      try {
        const u = new URL(rawPubUrl);
        let host = u.hostname;
        let port = DEFAULT_POSTGRES_PORT_TEXT;
        if (host.endsWith('.supabase.co')) {
          const ref = conf.TENANT_ID || conf.POOLER_TENANT_ID || host.split('.')[0] || 'postgres';
          host = `db.${host.split('.')[0]}.supabase.co`;
          console.log(styleText('cyan', `🏷️  Tenant ID / Project Ref detectado para [${canonicalName}]: ${ref}`));
          dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        } else {
          port = conf.POSTGRES_PORT || conf.DB_PORT || DEFAULT_POSTGRES_PORT_TEXT;
          const tenant = conf.TENANT_ID || conf.POOLER_TENANT_ID || 'your-tenant-id';
          console.log(styleText('cyan', `🏷️  Tenant ID detectado para [${canonicalName}]: ${tenant}`));
          dbUrl = `postgres://postgres.${tenant}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        }
      } catch {
        // ignore
      }
    }
  }
  return dbUrl;
}

export async function getValidatedServerConfigs(): Promise<{ serverConfigs: Record<string, ServerConfig>; baseProfiles: string[]; allAvailable: string[] }> {
  const serverConfigs = await readAndParseEnv();
  const baseProfiles = Object.keys(serverConfigs);
  if (baseProfiles.length === 0) {
    console.error(styleText('red', '❌ Error: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'));
    process.exit(1);
  }
  const allAvailable = Array.from(new Set(baseProfiles.concat(Object.values(serverConfigs).map(c => c.ID).filter(Boolean) as string[]))); // no-domain: Non-domain utility collection or data structure
  return { serverConfigs, baseProfiles, allAvailable };
}

export function findServerConfig(serverConfigs: Record<string, ServerConfig>, profileOrId: string): ServerConfig | null { // result-ok: Operation result wrapper payload
  const direct = serverConfigs[profileOrId];
  if (direct) return direct;
  const matchKey = Object.keys(serverConfigs).find(k => serverConfigs[k]?.ID === profileOrId);
  return matchKey ? (serverConfigs[matchKey] || null) : null;
}

export function parseServerArguments(args: string[], baseProfiles: string[], allAvailable: string[]): string[] {
  const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : a);
  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      server: { type: 'string', short: 's' },
      all: { type: 'boolean', short: 'a' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true,
    strict: false
  });

  const isHelp = values.help || args.includes('help') || args.includes('--help') || args.includes('-h');
  if (isHelp) {
    console.log(styleText('cyan', `\n📖 USO: npm run <comando> [server=<perfil> | <perfil> | all]`));
    console.log(styleText('gray', '\nOpciones disponibles:'));
    console.log(styleText('gray', '  server=<perfil>   : Nombre del perfil de servidor objetivo.'));
    console.log(styleText('gray', '  <perfil>          : Nombre directo del servidor (ej. server_franco, nas_franco).'));
    console.log(styleText('gray', '  all               : Aplica la operación a todos los servidores del .env.'));
    console.log(styleText('cyan', `\nPerfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(0);
  }

  const isAll = Boolean(values.all || values.server === 'all' || positionals.includes('all') || args.includes('all'));
  const rawServer = typeof values.server === 'string' ? values.server.replace(/^=/, '') : undefined;
  const serverArg = (rawServer && rawServer !== 'all' ? rawServer : undefined) ||
                    positionals.find(p => p !== 'all' && (allAvailable.includes(p) || baseProfiles.includes(p)));

  if (!serverArg && !isAll) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas seleccionar indicando server=<perfil>, el nombre del servidor o "all".'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplos:'));
    console.log(styleText('gray', '  npm run database:update server=server_franco'));
    console.log(styleText('gray', '  npm run database:update server_franco'));
    console.log(styleText('gray', '  npm run database:update all'));
    process.exit(1);
  }

  return serverArg ? [serverArg] : baseProfiles;
}
