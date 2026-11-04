/**
 * @file supabaseClient.ts
 * @description Helper compartido para leer el archivo .env maestro, parsear perfiles de servidor
 * y generar URLs de conexión de PostgreSQL consistentes entre scripts de administración.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import { parseArgs as parseCittyArgs } from 'citty';

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
  const serverConfigs: Record<string, ServerConfig> = {};

  const KNOWN_SUFFIXES = [
    // no-domain: Non-domain utility collection or data structure
    'SUPABASE_PUBLIC_URL',
    'API_EXTERNAL_URL',
    'SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY',
    'POSTGRES_PASSWORD',
    'SECRET_KEY_BASE',
    'DASHBOARD_USERNAME',
    'DASHBOARD_PASSWORD',
    'KONG_HTTPS_PORT',
    'PG_META_CRYPTO_KEY',
    'VAULT_ENC_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
    'SUPABASE_URL',
    'TENANT_ID',
    'IS_DEFAULT',
    'ANON_KEY',
    'SITE_URL',
    'REGION',
    'NAME',
    'KEY',
    'URL',
    'ID',
    'POSTGRES_PORT',
    'DB_PORT',
    'DB_PASSWORD',
    'POSTGRES_URL',
    'PG_URL'
  ];

  function parseKeyVal(fullKey: string, rawVal: string): void {
    let value = rawVal.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (fullKey.startsWith('SERVER_')) {
      const withoutPrefix = fullKey.slice('SERVER_'.length);
      const matchedSuffix = KNOWN_SUFFIXES.find((s) => withoutPrefix.endsWith(`_${s}`));
      if (matchedSuffix === undefined) return;

      const profile = withoutPrefix.slice(0, withoutPrefix.length - matchedSuffix.length - 1);
      if (!profile) return;

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

  // 1. Read .env file if accessible
  try {
    await using fileHandle = await fsPromises.open(ENV_FILE, 'r');
    const envContent = await fileHandle.readFile({ encoding: 'utf-8' });
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match && match[1] !== undefined && match[2] !== undefined) {
        parseKeyVal(match[1].trim(), match[2].trim());
      }
    }
  } catch (err) {
    console.warn('[Handled controlled exception]:', err);
  }

  // 2. Parse / overlay from process.env (CI/CD environments, GitHub Actions secrets)
  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith('SERVER_') && typeof val === 'string') {
      parseKeyVal(key, val);
    }
  }

  return serverConfigs;
}

export function buildDatabaseUrl(conf: ServerConfig, canonicalName: string): string {
  let dbUrl = conf.DATABASE_URL || conf.POSTGRES_URL || conf.PG_URL || '';
  if (!dbUrl) {
    const pass = conf.POSTGRES_PASSWORD || conf.DB_PASSWORD || '';
    const rawPubUrl =
      conf.SUPABASE_PUBLIC_URL ||
      conf.SUPABASE_URL ||
      conf.SITE_URL ||
      conf.API_EXTERNAL_URL ||
      conf.URL ||
      '';
    if (rawPubUrl && pass) {
      try {
        const u = new URL(rawPubUrl);
        let host = u.hostname;
        let port = DEFAULT_POSTGRES_PORT_TEXT;
        if (host.endsWith('.supabase.co')) {
          const ref = conf.TENANT_ID || conf.POOLER_TENANT_ID || host.split('.')[0] || 'postgres';
          host = `db.${host.split('.')[0]}.supabase.co`;
          console.log(
            styleText(
              'cyan',
              `🏷️  Tenant ID / Project Ref detectado para [${canonicalName}]: ${ref}`
            )
          );
          dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        } else {
          port = conf.POSTGRES_PORT || conf.DB_PORT || DEFAULT_POSTGRES_PORT_TEXT;
          const tenant = conf.TENANT_ID || conf.POOLER_TENANT_ID || 'your-tenant-id';
          console.log(
            styleText('cyan', `🏷️  Tenant ID detectado para [${canonicalName}]: ${tenant}`)
          );
          dbUrl = `postgres://postgres.${tenant}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        }
      } catch (err) {
        console.warn('[Handled controlled exception]:', err);
      }
    }
  }
  return dbUrl;
}

export async function getValidatedServerConfigs(): Promise<{
  serverConfigs: Record<string, ServerConfig>;
  baseProfiles: string[];
  allAvailable: string[];
}> {
  const serverConfigs = await readAndParseEnv();
  const baseProfiles = Object.keys(serverConfigs);
  if (baseProfiles.length === 0) {
    console.error(
      styleText(
        'red',
        '❌ Error: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'
      )
    );
    process.exit(1);
  }
  const allAvailable = Array.from(
    new Set(
      baseProfiles.concat(
        Object.values(serverConfigs)
          .map((c) => c.ID)
          .filter((id): id is string => typeof id === 'string')
      )
    )
  ); // no-domain: Non-domain utility collection or data structure
  return { serverConfigs, baseProfiles, allAvailable };
}

export function findServerConfig(
  serverConfigs: Record<string, ServerConfig>,
  profileOrId: string // infra-id-ok: Server configuration profile or server ID key
): ServerConfig | null {
  // result-ok: Operation result wrapper payload
  const direct = serverConfigs[profileOrId];
  if (direct) return direct;
  for (const conf of Object.values(serverConfigs)) {
    if (conf.ID === profileOrId) return conf;
  }
  return null;
}

export function parseServerArguments(
  args: string[],
  baseProfiles: string[],
  allAvailable: string[]
): string[] {
  const parsed = parseCittyArgs(args, {
    server: { type: 'string', alias: 's' },
    all: { type: 'boolean', alias: 'a' },
    help: { type: 'boolean', alias: 'h' }
  });

  const positionals = Array.isArray(parsed._)
    ? parsed._.filter((p): p is string => typeof p === 'string')
    : [];
  const isHelp = Boolean(parsed.help || positionals.includes('help'));
  if (isHelp) {
    console.log(
      styleText('cyan', `\n📖 USO: npm run <comando> [server=<perfil> | <perfil> | all]`)
    );
    console.log(styleText('gray', '\nOpciones disponibles:'));
    console.log(styleText('gray', '  server=<perfil>   : Nombre del perfil de servidor objetivo.'));
    console.log(
      styleText(
        'gray',
        '  <perfil>          : Nombre directo del servidor (ej. server_franco, cloud).'
      )
    );
    console.log(
      styleText(
        'gray',
        '  all               : Aplica la operación a todos los servidores del .env.'
      )
    );
    console.log(styleText('cyan', `\nPerfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(0);
  }

  const isAll = Boolean(parsed.all || parsed.server === 'all' || positionals.includes('all'));
  const rawServer =
    typeof parsed['server'] === 'string' ? String(parsed['server']).replace(/^=/, '') : undefined;
  const serverArg =
    (rawServer && rawServer !== 'all' ? rawServer : undefined) ||
    positionals.find((p) => p !== 'all' && (allAvailable.includes(p) || baseProfiles.includes(p)));

  if (!serverArg && !isAll) {
    console.log(
      styleText(
        'yellow',
        '⚠️  Especifica qué servidor deseas seleccionar indicando server=<perfil>, el nombre del servidor o "all".'
      )
    );
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplos:'));
    console.log(styleText('gray', '  npm run database:update server=server_franco'));
    console.log(styleText('gray', '  npm run database:update server_franco'));
    console.log(styleText('gray', '  npm run database:update all'));
    process.exit(1);
  }

  return serverArg ? [serverArg] : baseProfiles;
}

export interface ServerCliArgs {
  server?: string;
  target?: string;
  all?: boolean;
  _?: string[];
  [key: string]: unknown;
}

export type ServerCliOptions = ServerCliArgs;

export const serverCliArgs = {
  server: {
    type: 'string' as const,
    alias: 's',
    description: 'Nombre del perfil de servidor (ej: server_franco, cloud)'
  },
  target: {
    type: 'positional' as const,
    required: false,
    description: 'Perfil de servidor objetivo o "all"'
  },
  all: {
    type: 'boolean' as const,
    alias: 'a',
    description: 'Aplicar la operación a todos los servidores configurados'
  }
};

export function resolveServerProfiles(
  args: ServerCliArgs,
  baseProfiles: string[],
  allAvailable: string[]
): string[] {
  const rawInput = args.server || args.target;

  const cleanInput =
    typeof rawInput === 'string' ? rawInput.replace(/^(?:server|s)=/, '').trim() : undefined;

  const isAll = Boolean(args.all || cleanInput === 'all' || args.server === 'all');

  if (isAll) {
    return baseProfiles;
  }

  if (cleanInput) {
    if (allAvailable.includes(cleanInput) || baseProfiles.includes(cleanInput)) {
      return [cleanInput];
    }
    console.error(
      styleText(
        'red',
        `❌ Error: El perfil de servidor "${cleanInput}" no existe en el archivo .env.`
      )
    );
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    process.exit(1);
  }

  console.log(
    styleText(
      'yellow',
      '⚠️  Especifica qué servidor deseas seleccionar indicando server=<perfil>, el nombre del servidor o "all".'
    )
  );
  console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
  process.exit(1);
}
