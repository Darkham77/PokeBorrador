/**
 * @file postgres_test_container.ts
 * @description Modular Docker auto-discovery and ephemeral PostgreSQL container lifecycle
 * for testing and Playwright simulation environments.
 */

import { spawnSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { styleText } from 'node:util';

import {
  applyBootstrapSql,
  composeDown,
  composeUp,
  generateLiteBootstrapSql,
  generateLiteComposeYaml,
  generateLiteNginxConf
} from '@francogp/auditor/supabase';
import postgres from 'postgres';

import auditConfig from '../../.auditor/audit.config.ts';

const SUPABASE_DOCKER_CONFIG = auditConfig.supabaseDocker;
const LITE_TEST_PROFILE = SUPABASE_DOCKER_CONFIG?.profiles.lite?.get('test');
const PROJECT_SLUG = SUPABASE_DOCKER_CONFIG?.projectSlug ?? 'pokevicio';

export const CONTAINER_NAME = `${PROJECT_SLUG}-test-db`;
export const POSTGREST_CONTAINER_NAME = `${PROJECT_SLUG}-test-rest`;
export const GATEWAY_CONTAINER_NAME = `${PROJECT_SLUG}-test-gateway`;
export const POSTGRES_PORT = LITE_TEST_PROFILE?.ports.postgres ?? 54329;
export const POSTGRES_URL = `postgres://postgres:postgres@localhost:${POSTGRES_PORT}/postgres`;
export const POSTGREST_PORT = LITE_TEST_PROFILE?.ports.gateway ?? 54321;
export const POSTGREST_URL = `http://127.0.0.1:${POSTGREST_PORT}`;
export const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const LEGACY_TEST_CONTAINERS = [
  'pokevicio-test-postgres',
  'pokevicio-test-postgrest',
  'pokevicio-test-gateway'
] as const;

type LiteComposePaths = {
  outDir: string;
  composePath: string;
  nginxPath: string;
  envFilePath: string;
};

function formatErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createSignedJwt(payload: Record<string, unknown>, secret = JWT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = (obj: unknown): string => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export const SUPABASE_TEST_ANON_KEY = createSignedJwt({
  role: 'anon',
  iss: 'supabase',
  iat: 1600000000,
  exp: 2500000000
});

export const SUPABASE_TEST_SERVICE_KEY = createSignedJwt({
  role: 'service_role',
  iss: 'supabase',
  iat: 1600000000,
  exp: 2500000000
});

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');
const BASELINE_FILE = path.resolve(
  process.cwd(),
  'database/migrations/20240416000000_baseline_schema.sql'
);
const DOCKER_INFO_TIMEOUT_MS = 10000;
const DOCKER_START_POLL_ATTEMPTS = 15;
const POSTGRES_CONNECT_TIMEOUT_SEC = 10;
const POSTGRES_PING_TIMEOUT_SEC = 3;
const POSTGRES_READY_MAX_RETRIES = 20;
const POLL_INTERVAL_MS = 1000;
const POSTGRES_POLL_INTERVAL_MS = 500;
const HTTP_STATUS_OK = 200 as const;

export interface DockerDiscovery {
  dockerBin: string | null;
  isRunning: boolean;
  daemonError?: string;
}

function findDockerInSystemPath(isWin: boolean): string | null {
  const checkCmd = isWin ? 'where.exe' : 'which';
  try {
    const res = spawnSync(checkCmd, ['docker'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    if (res.status === 0 && res.stdout) {
      const firstLine = res.stdout.trim().split('\n')[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    }
  } catch (err) {
    console.warn('[Handled controlled exception]:', err);
  }
  return null;
}

function getPlatformDockerFallbackCandidates(isWin: boolean): string[] {
  const fallbackCandidates: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'; // cross-platform-ok
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'; // cross-platform-ok

    if (localAppData) {
      fallbackCandidates.push(
        path.join(localAppData, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe')
      );
    }
    fallbackCandidates.push(
      path.join(programFiles, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')
    );
    fallbackCandidates.push(
      path.join(programFilesX86, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')
    );
  } else {
    fallbackCandidates.push(
      '/usr/bin/docker',
      '/usr/local/bin/docker',
      '/snap/bin/docker',
      '/opt/homebrew/bin/docker',
      '/usr/local/homebrew/bin/docker'
    );
    const homeDir = os.homedir();
    if (homeDir) {
      fallbackCandidates.push(path.join(homeDir, '.docker', 'bin', 'docker'));
    }
  }
  return fallbackCandidates;
}

/**
 * Searches for docker executable across common system and platform paths.
 */
export function findDockerBinary(): string | null {
  const isWin = process.platform === 'win32';
  const systemPathBinary = findDockerInSystemPath(isWin);
  if (systemPathBinary) return systemPathBinary;

  const fallbackCandidates = getPlatformDockerFallbackCandidates(isWin);
  for (const candidate of fallbackCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Tests if Docker daemon is responsive.
 */
export function isDockerDaemonRunning(dockerBin: string): boolean {
  try {
    const res = spawnSync(dockerBin, ['info'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: DOCKER_INFO_TIMEOUT_MS
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Attempts to automatically start the Docker service/daemon if it is stopped.
 */
export async function tryStartDockerDaemon(dockerBin: string): Promise<boolean> {
  const isWin = process.platform === 'win32';
  console.log(
    styleText(
      'cyan',
      '⏳ Docker detectado pero el daemon está inactivo. Intentando iniciar el servicio de Docker...'
    )
  );

  try {
    if (isWin) {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files'; // cross-platform-ok
      const desktopExes = [
        path.join(localAppData, 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
        path.join(programFiles, 'Docker', 'Docker', 'Docker Desktop.exe')
      ];
      const foundExe = desktopExes.find((e) => fs.existsSync(e));
      if (foundExe) {
        const detached = spawn(foundExe, [], { detached: true, stdio: 'ignore' });
        detached.unref();
      } else {
        spawnSync(
          'powershell.exe',
          ['-Command', 'Start-Service com.docker.service -ErrorAction SilentlyContinue'],
          { stdio: 'ignore' }
        );
      }
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' }).unref();
    } else {
      // Linux
      spawnSync('systemctl', ['--user', 'start', 'docker'], { stdio: 'ignore' });
      spawnSync('sudo', ['systemctl', 'start', 'docker'], { stdio: 'ignore' });
    }
  } catch (err) {
    console.warn('[Handled controlled exception]:', err);
  }

  for (let i = 1; i <= DOCKER_START_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (isDockerDaemonRunning(dockerBin)) {
      console.log(styleText('green', `✅ Docker daemon iniciado exitosamente (${i}s).`));
      return true;
    }
  }

  console.log(
    styleText(
      'red',
      '🚨 [DOCKER APAGADO] No se pudo iniciar el servicio de Docker automáticamente en el tiempo límite.\n' +
        '👉 POR FAVOR, ABRE Y ENCIENDE DOCKER DESKTOP MANUALMENTE PARA CONTINUAR.'
    )
  );
  return false;
}

/**
 * Inspects Docker availability and readiness.
 */
export async function inspectDocker(): Promise<DockerDiscovery> {
  const dockerBin = findDockerBinary();
  if (!dockerBin) {
    return { dockerBin: null, isRunning: false };
  }

  // Prepend Docker bin directory to PATH so docker-credential-desktop, docker-compose, etc. are found
  const dockerDir = path.dirname(dockerBin);
  const pathSep = process.platform === 'win32' ? ';' : ':';
  if (!process.env.PATH?.includes(dockerDir)) {
    process.env.PATH = `${dockerDir}${pathSep}${process.env.PATH || ''}`;
  }

  let isRunning = isDockerDaemonRunning(dockerBin);
  if (!isRunning) {
    isRunning = await tryStartDockerDaemon(dockerBin);
  }

  return { dockerBin, isRunning };
}

/**
 * Applies SQL migrations to the PostgreSQL test database.
 */
export async function applyMigrationsToPostgres(dbUrl: string): Promise<void> {
  const sql = postgres(dbUrl, {
    max: 1,
    connect_timeout: POSTGRES_CONNECT_TIMEOUT_SEC,
    onnotice: () => {}
  });
  try {
    // 1. Prepare environment: extensions, roles, auth schema, and publication
    await sql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE plpgsql STABLE AS $$
      DECLARE
        claims_json JSONB;
        sub_val TEXT;
      BEGIN
        BEGIN
          claims_json := current_setting('request.jwt.claims', true)::JSONB;
          sub_val := claims_json->>'sub';
        EXCEPTION WHEN OTHERS THEN
          sub_val := NULL;
        END;

        IF sub_val IS NULL OR sub_val = '' THEN
          sub_val := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        END IF;

        IF sub_val IS NOT NULL AND sub_val != '' THEN
          RETURN sub_val::UUID;
        END IF;

        RETURN '11111111-1111-1111-1111-111111111111'::UUID;
      END;
      $$;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
      DECLARE
        claims_json JSONB;
        role_val TEXT;
      BEGIN
        BEGIN
          claims_json := current_setting('request.jwt.claims', true)::JSONB;
          role_val := claims_json->>'role';
        EXCEPTION WHEN OTHERS THEN
          role_val := NULL;
        END;
        IF role_val IS NOT NULL AND role_val != '' THEN
          RETURN role_val;
        END IF;
        RETURN 'authenticated';
      END;
      $$;

      CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT LANGUAGE sql STABLE AS $$
        SELECT 'tester@local'::TEXT;
      $$;

      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
      DECLARE
        claims_json JSONB;
      BEGIN
        BEGIN
          claims_json := current_setting('request.jwt.claims', true)::JSONB;
        EXCEPTION WHEN OTHERS THEN
          claims_json := NULL;
        END;
        IF claims_json IS NOT NULL THEN
          RETURN claims_json;
        END IF;
        RETURN '{"role": "authenticated"}'::jsonb;
      END;
      $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;
    `);

    // 2. Create baseline schema if not exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('profiles', 'system_config', '_migrations')
    `;

    const existingTables = tables.map((t) => t.table_name as string);
    if (existingTables.length === 0) {
      const baselineContent = await fsPromises.readFile(BASELINE_FILE, 'utf-8');
      await sql.unsafe(baselineContent);
      await sql`CREATE TABLE IF NOT EXISTS public._migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql`INSERT INTO public._migrations (id) VALUES ('20240416000000_baseline_schema') ON CONFLICT DO NOTHING`;
    } else {
      await sql`CREATE TABLE IF NOT EXISTS public._migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
    }

    // 3. Apply patch migrations
    const appliedRows = await sql`SELECT id FROM public._migrations`;
    const appliedIds = new Set(appliedRows.map((r) => r.id as string));

    const files = (await fsPromises.readdir(MIGRATIONS_DIR))
      .filter(
        (f) => f.endsWith('.sql') && !f.includes('baseline_schema') && !f.includes('.sqlite.')
      )
      .sort((a, b) => a.localeCompare(b));

    for (const filename of files) {
      const migrationId = filename.replace('.sql', '');
      if (!appliedIds.has(migrationId)) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        let sqlContent = await fsPromises.readFile(filePath, 'utf-8');

        // Apply Postgres dialect adapters
        sqlContent = sqlContent.replace(
          /created_at NOT LIKE/g,
          'CAST(created_at AS TEXT) NOT LIKE'
        );
        sqlContent = sqlContent.replace(
          /SET created_at = REPLACE\(created_at, ' ', 'T'\) \|\| 'Z'/g,
          "SET created_at = CAST(REPLACE(CAST(created_at AS TEXT), ' ', 'T') || 'Z' AS TIMESTAMPTZ)"
        );
        sqlContent = sqlContent.replace(
          /DROP TABLE IF EXISTS events_config;/g,
          'DROP TABLE IF EXISTS events_config CASCADE;'
        );
        sqlContent = sqlContent.replace(
          /WHERE user_id = '(local_[^']+)'/g,
          "WHERE user_id::text = '$1'"
        );
        sqlContent = sqlContent.replace(
          /ADD COLUMN (?!IF NOT EXISTS)/g,
          'ADD COLUMN IF NOT EXISTS '
        );

        try {
          await sql.begin(async (tx) => {
            await tx.unsafe(sqlContent);
            await tx`INSERT INTO public._migrations (id) VALUES (${migrationId}) ON CONFLICT (id) DO NOTHING`;
          });
        } catch (patchErr: unknown) {
          const pMsg = patchErr instanceof Error ? patchErr.message : String(patchErr);
          console.error(
            `❌ Fallo crítico al aplicar migración ${migrationId} en PostgreSQL efímero: ${pMsg}`
          );
          throw patchErr;
        }
      }
    }

    // 4. Ensure app_version is present in system_config if missing
    await sql.unsafe(`
      INSERT INTO public.system_config (key, value)
      VALUES ('app_version', '"v0.5.0"'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    // 5. Setup PostgREST authentication and schema access grants
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
          CREATE ROLE authenticator LOGIN PASSWORD 'postgres';
        END IF;
        CREATE SCHEMA IF NOT EXISTS storage;
        GRANT anon, authenticated, service_role TO authenticator;
        GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
      END $$;
    `);

    // Notify PostgREST to reload its schema cache
    try {
      await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    } catch (err) {
      console.warn('[Handled controlled exception]:', err);
    }
  } finally {
    await sql.end();
  }
}

/**
 * Waits for PostgreSQL server to be ready for connections.
 */
export async function waitForPostgres(
  dbUrl: string,
  maxRetries = POSTGRES_READY_MAX_RETRIES
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const sql = postgres(dbUrl, { max: 1, connect_timeout: POSTGRES_PING_TIMEOUT_SEC });
      await sql`SELECT 1`;
      await sql.end();
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, POSTGRES_POLL_INTERVAL_MS));
    }
  }
  return false;
}

/**
 * Waits for PostgREST HTTP REST server to be ready through the gateway.
 */
export async function waitForPostgrest(maxRetries = POSTGRES_READY_MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${POSTGREST_URL}/rest/v1/system_config`, {
        headers: { apikey: SUPABASE_TEST_ANON_KEY }
      });
      if (res.ok || res.status === HTTP_STATUS_OK) {
        return true;
      }
    } catch (err) {
      console.warn('[Handled controlled exception]:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POSTGRES_POLL_INTERVAL_MS));
  }
  return false;
}

function resolveLitePathsSync(): LiteComposePaths {
  const supabaseDir = SUPABASE_DOCKER_CONFIG?.supabaseDir ?? 'supabase';
  const outDir = path.resolve(process.cwd(), supabaseDir, 'generated', 'lite', 'test');
  return {
    outDir,
    composePath: path.join(outDir, 'docker-compose.yml'),
    nginxPath: path.join(outDir, 'nginx.conf'),
    envFilePath: path.join(outDir, '.env')
  };
}

/**
 * Stops and removes the ephemeral PostgreSQL, PostgREST & Gateway test containers.
 */
export function stopPostgresTestContainer(): void {
  const { composePath, envFilePath } = resolveLitePathsSync();
  if (fs.existsSync(composePath)) {
    try {
      composeDown(composePath, {
        removeVolumes: true,
        envFilePath: fs.existsSync(envFilePath) ? envFilePath : undefined
      });
    } catch (err) {
      console.warn('[Handled controlled exception]:', err);
    }
  }
}

async function materializeLiteTestArtifacts(): Promise<{
  paths: LiteComposePaths;
  bootstrapSql: string;
  adminRole: string | undefined;
} | null> {
  if (!SUPABASE_DOCKER_CONFIG?.enabled || !LITE_TEST_PROFILE?.enabled) {
    console.log(
      styleText(
        'yellow',
        '⚠️  supabaseDocker.profiles.lite.test no está habilitado en .auditor/audit.config.ts.'
      )
    );
    return null;
  }

  const paths = resolveLitePathsSync();
  await fsPromises.mkdir(paths.outDir, { recursive: true });

  const composeYaml = generateLiteComposeYaml(
    {
      projectSlug: SUPABASE_DOCKER_CONFIG.projectSlug,
      profileName: 'test',
      profile: LITE_TEST_PROFILE
    },
    { postgresPassword: 'postgres', jwtSecret: JWT_SECRET }
  );
  const nginxConf = generateLiteNginxConf(POSTGREST_CONTAINER_NAME, LITE_TEST_PROFILE.nginx);
  const bootstrapSql = [
    'ALTER ROLE postgres WITH SUPERUSER;',
    'GRANT ALL ON SCHEMA auth TO postgres;',
    generateLiteBootstrapSql(JWT_SECRET, 'postgres')
  ].join('\n');

  await fsPromises.writeFile(paths.composePath, composeYaml, 'utf-8');
  await fsPromises.writeFile(paths.nginxPath, nginxConf, 'utf-8');
  await fsPromises.writeFile(
    paths.envFilePath,
    `# Auto-generated deterministic credentials for lite.test\nPOSTGRES_PASSWORD=postgres\nJWT_SECRET=${JWT_SECRET}\n`,
    'utf-8'
  );

  return { paths, bootstrapSql, adminRole: SUPABASE_DOCKER_CONFIG.postgres.adminRole };
}

/**
 * Ensures the ephemeral PostgreSQL & PostgREST Docker containers are running, responsive,
 * and updated with all database schema migrations.
 */
export async function ensurePostgresTestContainerReady(forceRecreate = false): Promise<{
  isReady: boolean;
  postgresUrl: string;
  postgrestUrl: string;
  dockerBin: string | null;
}> {
  const dockerInfo = await inspectDocker();
  const dockerBin = dockerInfo.dockerBin;

  const failResult = {
    isReady: false,
    postgresUrl: POSTGRES_URL,
    postgrestUrl: POSTGREST_URL,
    dockerBin
  };

  if (!dockerInfo.isRunning || !dockerBin) {
    return failResult;
  }

  // 0. Quick check: if already running and healthy, reuse without container/network recreation churn
  if (!forceRecreate) {
    const isPgRunning = await waitForPostgres(POSTGRES_URL, 3);
    const isPostgrestRunning = await waitForPostgrest(3);
    if (isPgRunning && isPostgrestRunning) {
      console.log(
        styleText(
          'green',
          '✅ Pila Supabase (PostgreSQL + PostgREST + Gateway) ya activa y lista en RAM.'
        )
      );
      try {
        await applyMigrationsToPostgres(POSTGRES_URL);
      } catch (migErr) {
        console.error(
          styleText(
            'red',
            `❌ Error al aplicar migraciones incrementales en PostgreSQL: ${formatErrorMessage(migErr)}`
          )
        );
      }
      return { isReady: true, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }
  }

  console.log(
    styleText(
      'cyan',
      `🐳 Docker activo detectado (${dockerBin}). Preparando pila Supabase lite.test (@francogp/auditor/supabase)...`
    )
  );

  // 1. Clean up any lingering legacy standalone test containers before first lite.test startup
  for (const legacyName of LEGACY_TEST_CONTAINERS) {
    spawnSync(dockerBin, ['rm', '-f', legacyName], { stdio: 'ignore' });
  }

  // 2. Read SSoT supabaseDocker config and materialize lite.test artifacts
  const artifacts = await materializeLiteTestArtifacts();
  if (!artifacts) {
    return failResult;
  }
  const {
    paths: { composePath, envFilePath },
    bootstrapSql,
    adminRole
  } = artifacts;

  if (forceRecreate) {
    try {
      composeDown(composePath, { removeVolumes: true, envFilePath });
    } catch (err: unknown) {
      console.warn(
        `[Handled controlled exception] composeDown before recreate: ${formatErrorMessage(err)}`
      );
    }
  }

  // 3. Phase 1: Boot DB container and wait for pg_isready
  try {
    composeUp(composePath, envFilePath, [CONTAINER_NAME]);
  } catch (err: unknown) {
    console.log(
      styleText(
        'yellow',
        `⚠️  No se pudo iniciar el contenedor PostgreSQL: ${formatErrorMessage(err)}`
      )
    );
    return failResult;
  }

  const isPgReady = await waitForPostgres(POSTGRES_URL);
  if (!isPgReady) {
    console.log(styleText('yellow', '⚠️  PostgreSQL no respondió a tiempo.'));
    return failResult;
  }

  // 4. Bootstrap roles/JWT GUC and apply schema migrations
  try {
    applyBootstrapSql(CONTAINER_NAME, bootstrapSql, adminRole);
    await applyMigrationsToPostgres(POSTGRES_URL);
    console.log(styleText('green', '✅ PostgreSQL listo y migraciones aplicadas.'));
  } catch (migErr) {
    console.error(
      styleText(
        'red',
        `❌ Error al aplicar migraciones en PostgreSQL: ${formatErrorMessage(migErr)}`
      )
    );
    return failResult;
  }

  // 5. Phase 2: Boot PostgREST and Nginx Gateway
  try {
    composeUp(composePath, envFilePath);
  } catch (err: unknown) {
    console.log(
      styleText('yellow', `⚠️  No se pudo iniciar PostgREST / Gateway: ${formatErrorMessage(err)}`)
    );
    return failResult;
  }

  const isPostgrestReady = await waitForPostgrest();
  if (!isPostgrestReady) {
    console.log(
      styleText(
        'yellow',
        `⚠️  PostgREST Gateway no respondió a tiempo en el puerto ${POSTGREST_PORT}.`
      )
    );
    return failResult;
  }

  console.log(
    styleText(
      'green',
      `✅ Pila Supabase (PostgreSQL :${POSTGRES_PORT} + PostgREST + Gateway :${POSTGREST_PORT}) lista en RAM.`
    )
  );
  return { isReady: true, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
}
