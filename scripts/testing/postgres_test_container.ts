/**
 * @file postgres_test_container.ts
 * @description Modular Docker auto-discovery and ephemeral PostgreSQL container lifecycle
 * for testing and Playwright simulation environments.
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { spawnSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import postgres from 'postgres';

export const CONTAINER_NAME = 'pokevicio-test-postgres';
export const POSTGREST_CONTAINER_NAME = 'pokevicio-test-postgrest';
export const GATEWAY_CONTAINER_NAME = 'pokevicio-test-gateway';
export const DOCKER_NETWORK = 'pokevicio-test-net';
export const POSTGRES_PORT = 54329;
export const POSTGRES_URL = `postgres://postgres:postgres@localhost:${POSTGRES_PORT}/postgres`;
export const POSTGREST_PORT = 54321;
export const POSTGREST_URL = `http://127.0.0.1:${POSTGREST_PORT}`;
export const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

export function createSignedJwt(payload: Record<string, unknown>, secret = JWT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
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
const BASELINE_FILE = path.resolve(process.cwd(), 'database/migrations/20240416000000_baseline_schema.sql');
const DOCKER_INFO_TIMEOUT_MS = 3000;
const DOCKER_START_POLL_ATTEMPTS = 15;
const POSTGRES_CONNECT_TIMEOUT_SEC = 10;
const POSTGRES_PING_TIMEOUT_SEC = 1;
const POSTGRES_READY_MAX_RETRIES = 20;
const POLL_INTERVAL_MS = 1000;
const POSTGRES_POLL_INTERVAL_MS = 500;

export interface DockerDiscovery {
  dockerBin: string | null;
  isRunning: boolean;
  daemonError?: string;
}

/**
 * Searches for docker executable across common system and platform paths.
 */
export function findDockerBinary(): string | null {
  const isWin = process.platform === 'win32';
  const checkCmd = isWin ? 'where.exe' : 'which';

  // 1. Try finding in system PATH
  try {
    const res = spawnSync(checkCmd, ['docker'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (res.status === 0 && res.stdout) {
      const firstLine = res.stdout.trim().split('\n')[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    }
  } catch {
    // Ignore and proceed to fallback paths
  }

  // 2. Known fallback paths by platform
  const fallbackCandidates: string[] = []; // no-domain: Non-domain utility collection or data structure

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'; // cross-platform-ok
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'; // cross-platform-ok

    if (localAppData) {
      fallbackCandidates.push(path.join(localAppData, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'));
    }
    fallbackCandidates.push(path.join(programFiles, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'));
    fallbackCandidates.push(path.join(programFilesX86, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'));
  } else {
    // Linux / macOS / Unix
    fallbackCandidates.push(
      '/usr/bin/docker',
      '/usr/local/bin/docker',
      '/snap/bin/docker',
      '/opt/homebrew/bin/docker',
      '/usr/local/homebrew/bin/docker'
    );
    if (process.env.HOME && !process.env.HOME.includes('..')) {
      fallbackCandidates.push(path.join(path.resolve(process.env.HOME), '.docker', 'bin', 'docker'));
    }
  }

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
  console.log(styleText('cyan', '⏳ Docker detectado pero el daemon está inactivo. Intentando iniciar el servicio de Docker...'));

  try {
    if (isWin) {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files'; // cross-platform-ok
      const desktopExes = [
        path.join(localAppData, 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
        path.join(programFiles, 'Docker', 'Docker', 'Docker Desktop.exe')
      ];
      const foundExe = desktopExes.find(e => fs.existsSync(e));
      if (foundExe) {
        const detached = spawn(foundExe, [], { detached: true, stdio: 'ignore' });
        detached.unref();
      } else {
        spawnSync('powershell.exe', ['-Command', 'Start-Service com.docker.service -ErrorAction SilentlyContinue'], { stdio: 'ignore' });
      }
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' }).unref();
    } else {
      // Linux
      spawnSync('systemctl', ['--user', 'start', 'docker'], { stdio: 'ignore' });
      spawnSync('sudo', ['systemctl', 'start', 'docker'], { stdio: 'ignore' });
    }
  } catch {
    // Ignore and proceed to poll
  }

  for (let i = 1; i <= DOCKER_START_POLL_ATTEMPTS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    if (isDockerDaemonRunning(dockerBin)) {
      console.log(styleText('green', `✅ Docker daemon iniciado exitosamente (${i}s).`));
      return true;
    }
  }

  console.log(styleText('yellow', '⚠️  No se pudo iniciar el servicio de Docker automáticamente en el tiempo límite.'));
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
  const sql = postgres(dbUrl, { max: 1, connect_timeout: POSTGRES_CONNECT_TIMEOUT_SEC, onnotice: () => {} });
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

    const existingTables = tables.map(t => t.table_name as string);
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
    const appliedIds = new Set(appliedRows.map(r => r.id as string));

    const files = (await fsPromises.readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql') && !f.includes('baseline_schema') && !f.includes('.sqlite.'))
      .sort((a, b) => a.localeCompare(b));

    for (const filename of files) {
      const migrationId = filename.replace('.sql', '');
      if (!appliedIds.has(migrationId)) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        let sqlContent = await fsPromises.readFile(filePath, 'utf-8');

        // Apply Postgres dialect adapters
        sqlContent = sqlContent.replace(/created_at NOT LIKE/g, 'CAST(created_at AS TEXT) NOT LIKE');
        sqlContent = sqlContent.replace(/SET created_at = REPLACE\(created_at, ' ', 'T'\) \|\| 'Z'/g, "SET created_at = CAST(REPLACE(CAST(created_at AS TEXT), ' ', 'T') || 'Z' AS TIMESTAMPTZ)");
        sqlContent = sqlContent.replace(/DROP TABLE IF EXISTS events_config;/g, 'DROP TABLE IF EXISTS events_config CASCADE;');
        sqlContent = sqlContent.replace(/WHERE user_id = '(local_[^']+)'/g, "WHERE user_id::text = '$1'");

        try {
          await sql.begin(async (tx) => {
            await tx.unsafe(sqlContent);
            await tx`INSERT INTO public._migrations (id) VALUES (${migrationId})`;
          });
        } catch (patchErr: unknown) {
          const pMsg = patchErr instanceof Error ? patchErr.message : String(patchErr);
          if (pMsg.toLowerCase().includes('already exists') || pMsg.toLowerCase().includes('duplicate')) {
            await sql`INSERT INTO public._migrations (id) VALUES (${migrationId}) ON CONFLICT DO NOTHING`;
          } else {
            throw patchErr;
          }
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
        GRANT anon, authenticated, service_role TO authenticator;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
      END $$;
    `);
  } finally {
    await sql.end();
  }
}

  /**
   * Waits for PostgreSQL server to be ready for connections.
   */
  export async function waitForPostgres(dbUrl: string, maxRetries = POSTGRES_READY_MAX_RETRIES): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const sql = postgres(dbUrl, { max: 1, connect_timeout: POSTGRES_PING_TIMEOUT_SEC });
        await sql`SELECT 1`;
        await sql.end();
        return true;
      } catch {
        await new Promise(resolve => setTimeout(resolve, POSTGRES_POLL_INTERVAL_MS));
      }
    }
    return false;
  }

  /**
   * Waits for PostgREST HTTP REST server to be ready through the gateway.
   */
  export async function waitForPostgrest(maxRetries = 20): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${POSTGREST_URL}/rest/v1/system_config`, {
          headers: { apikey: SUPABASE_TEST_ANON_KEY }
        });
        if (res.ok || res.status === 200) {
          return true;
        }
      } catch {
        // Retry
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  /**
   * Stops and removes the ephemeral PostgreSQL, PostgREST & Gateway test containers.
   */
  export function stopPostgresTestContainer(dockerBin?: string | null): void {
    const bin = dockerBin || findDockerBinary();
    if (bin) {
      try {
        spawnSync(bin, ['rm', '-f', GATEWAY_CONTAINER_NAME], { stdio: 'ignore' });
        spawnSync(bin, ['rm', '-f', POSTGREST_CONTAINER_NAME], { stdio: 'ignore' });
        spawnSync(bin, ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });
      } catch {
        // Ignore cleanup error
      }
    }
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

    if (!dockerInfo.isRunning || !dockerBin) {
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    // 0. Quick check: if already running and healthy, reuse without container/network recreation churn
    if (!forceRecreate) {
      const isPgRunning = await waitForPostgres(POSTGRES_URL, 1);
      const isPostgrestRunning = await waitForPostgrest(1);
      if (isPgRunning && isPostgrestRunning) {
        console.log(styleText('green', '✅ Pila Supabase (PostgreSQL + PostgREST + Gateway) ya activa y lista en RAM.'));
        return { isReady: true, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
      }
    }

    console.log(styleText('cyan', `🐳 Docker activo detectado (${dockerBin}). Preparando pila Supabase (PostgreSQL + PostgREST + Gateway)...`));

    // 1. Ensure docker network exists
    spawnSync(dockerBin, ['network', 'create', DOCKER_NETWORK], { stdio: 'ignore' });

    // 2. Remove lingering containers
    spawnSync(dockerBin, ['rm', '-f', GATEWAY_CONTAINER_NAME], { stdio: 'ignore' });
    spawnSync(dockerBin, ['rm', '-f', POSTGREST_CONTAINER_NAME], { stdio: 'ignore' });
    spawnSync(dockerBin, ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });

    // 3. Run PostgreSQL container with tmpfs on RAM for maximum speed
    const runPgRes = spawnSync(dockerBin, [
      'run', '-d',
      '--name', CONTAINER_NAME,
      '--network', DOCKER_NETWORK,
      '-p', `${POSTGRES_PORT}:5432`,
      '-e', 'POSTGRES_PASSWORD=postgres',
      '-e', 'POSTGRES_USER=postgres',
      '-e', 'POSTGRES_DB=postgres',
      '--tmpfs', '/var/lib/postgresql/data:rw',
      'postgres:15-alpine',
      '-c', 'synchronous_commit=off',
      '-c', 'fsync=off',
      '-c', 'full_page_writes=off',
      '-c', 'max_connections=200'
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

    if (runPgRes.status !== 0) {
      console.log(styleText('yellow', `⚠️  No se pudo iniciar el contenedor PostgreSQL: ${runPgRes.stderr?.trim() || 'Error desconocido'}`));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    const isPgReady = await waitForPostgres(POSTGRES_URL);
    if (!isPgReady) {
      console.log(styleText('yellow', '⚠️  PostgreSQL no respondió a tiempo.'));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    try {
      await applyMigrationsToPostgres(POSTGRES_URL);
      console.log(styleText('green', '✅ PostgreSQL listo y migraciones aplicadas.'));
    } catch (migErr) {
      console.error(styleText('red', `❌ Error al aplicar migraciones en PostgreSQL: ${(migErr as Error).message}`));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    // 4. Run PostgREST container connected to PostgreSQL via Docker network
    const runPostgrestRes = spawnSync(dockerBin, [
      'run', '-d',
      '--name', POSTGREST_CONTAINER_NAME,
      '--network', DOCKER_NETWORK,
      '-e', `PGRST_DB_URI=postgres://authenticator:postgres@${CONTAINER_NAME}:5432/postgres`,
      '-e', 'PGRST_DB_SCHEMAS=public,storage',
      '-e', 'PGRST_DB_ANON_ROLE=anon',
      '-e', `PGRST_JWT_SECRET=${JWT_SECRET}`,
      '-e', 'PGRST_DB_USE_BUILTIN_RAISE=true',
      '-e', 'PGRST_DB_POOL=50',
      '-e', 'PGRST_DB_POOL_TIMEOUT=30',
      'postgrest/postgrest:v12.2.0'
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

    if (runPostgrestRes.status !== 0) {
      console.log(styleText('yellow', `⚠️  No se pudo iniciar el contenedor PostgREST: ${runPostgrestRes.stderr?.trim() || 'Error desconocido'}`));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    // 5. Run Nginx Gateway container (exposing standard Supabase port 54321)
    const confDir = path.resolve(process.cwd(), 'scratch');
    await fsPromises.mkdir(confDir, { recursive: true });
    const confPath = path.resolve(confDir, 'test_gateway.conf');
    const nginxConf = `events {}
http {
  server {
    listen 54321;
    location /rest/v1/ {
      proxy_pass http://${POSTGREST_CONTAINER_NAME}:3000/;
      proxy_set_header Host $host;
      proxy_pass_request_headers on;
    }
    location / {
      proxy_pass http://${POSTGREST_CONTAINER_NAME}:3000/;
      proxy_set_header Host $host;
      proxy_pass_request_headers on;
    }
  }
}
`;
    await fsPromises.writeFile(confPath, nginxConf, 'utf-8');

    const runGatewayRes = spawnSync(dockerBin, [
      'run', '-d',
      '--name', GATEWAY_CONTAINER_NAME,
      '--network', DOCKER_NETWORK,
      '-p', `${POSTGREST_PORT}:54321`,
      '-v', `${confPath}:/etc/nginx/nginx.conf:ro`,
      'nginx:alpine'
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

    if (runGatewayRes.status !== 0) {
      console.log(styleText('yellow', `⚠️  No se pudo iniciar el contenedor Gateway: ${runGatewayRes.stderr?.trim() || 'Error desconocido'}`));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    const isPostgrestReady = await waitForPostgrest();
    if (!isPostgrestReady) {
      console.log(styleText('yellow', '⚠️  PostgREST Gateway no respondió a tiempo en el puerto 54321.'));
      return { isReady: false, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
    }

    console.log(styleText('green', `✅ Pila Supabase (PostgreSQL :${POSTGRES_PORT} + PostgREST + Gateway :${POSTGREST_PORT}) lista en RAM.`));
    return { isReady: true, postgresUrl: POSTGRES_URL, postgrestUrl: POSTGREST_URL, dockerBin };
  }
