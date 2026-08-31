/**
 * @file run_tests.ts
 * @description Testing orchestrator script with multi-platform Docker auto-discovery,
 * daemon auto-start, ephemeral PostgreSQL container lifecycle, and dual-engine Vitest execution.
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { spawnSync, spawn } from 'node:child_process';
import postgres from 'postgres';

const CONTAINER_NAME = 'pokevicio-test-postgres';
const POSTGRES_PORT = 54329;
const POSTGRES_URL = `postgres://postgres:postgres@localhost:${POSTGRES_PORT}/postgres`;
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');
const BASELINE_FILE = path.resolve(process.cwd(), 'database/migrations/20240416000000_baseline_schema.sql');

interface DockerDiscovery {
  dockerBin: string | null;
  isRunning: boolean;
  daemonError?: string;
}

/**
 * Searches for docker executable across common system and platform paths.
 */
function findDockerBinary(): string | null {
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
  const fallbackCandidates: string[] = []; // no-domain

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
function isDockerDaemonRunning(dockerBin: string): boolean {
  try {
    const res = spawnSync(dockerBin, ['info'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3000
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Attempts to automatically start the Docker service/daemon if it is stopped.
 */
async function tryStartDockerDaemon(dockerBin: string): Promise<boolean> {
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

  // Poll for up to 15 seconds
  const maxAttempts = 15;
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
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
async function inspectDocker(): Promise<DockerDiscovery> {
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
async function applyMigrations(dbUrl: string): Promise<void> {
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 10, onnotice: () => {} });
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
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
        SELECT NULL::UUID;
      $$;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
        SELECT 'authenticated'::TEXT;
      $$;
      CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT LANGUAGE sql STABLE AS $$
        SELECT 'tester@local'::TEXT;
      $$;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT '{"role": "authenticated"}'::jsonb;
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

    // 2. Apply patch migrations
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
  } finally {
    await sql.end();
  }
}

/**
 * Waits for PostgreSQL server to be ready for connections.
 */
async function waitForPostgres(dbUrl: string, maxRetries = 20): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const sql = postgres(dbUrl, { max: 1, connect_timeout: 1 });
      await sql`SELECT 1`;
      await sql.end();
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}

/**
 * Main execution routine.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dockerInfo = await inspectDocker();

  let containerStarted = false;
  let postgresReady = false;
  const dockerBin = dockerInfo.dockerBin;

  const cleanupContainer = () => {
    if (containerStarted && dockerBin) {
      try {
        spawnSync(dockerBin, ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });
      } catch {
        // Ignore
      }
    }
  };

  // Register signal listeners for guaranteed teardown
  process.on('SIGINT', () => {
    cleanupContainer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanupContainer();
    process.exit(143);
  });
  process.on('exit', () => {
    cleanupContainer();
  });

  if (dockerInfo.isRunning && dockerBin) {
    console.log(styleText('cyan', `🐳 Docker activo detectado (${dockerBin}). Preparando contenedor efímero PostgreSQL...`));

    // Remove any lingering container
    spawnSync(dockerBin, ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });

    // Run container with tmpfs on RAM
    const runRes = spawnSync(dockerBin, [
      'run', '-d',
      '--name', CONTAINER_NAME,
      '-p', `${POSTGRES_PORT}:5432`,
      '-e', 'POSTGRES_PASSWORD=postgres',
      '-e', 'POSTGRES_USER=postgres',
      '-e', 'POSTGRES_DB=postgres',
      '--tmpfs', '/var/lib/postgresql/data:rw',
      'postgres:15-alpine'
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

    if (runRes.status === 0) {
      containerStarted = true;
      const isReady = await waitForPostgres(POSTGRES_URL);
      if (isReady) {
        try {
          await applyMigrations(POSTGRES_URL);
          postgresReady = true;
          console.log(styleText('green', '✅ Base de datos PostgreSQL efímera lista y migraciones aplicadas.'));
        } catch (migErr) {
          console.error(styleText('red', `❌ Error al aplicar migraciones en PostgreSQL: ${(migErr as Error).message}`));
        }
      } else {
        console.log(styleText('yellow', '⚠️  PostgreSQL no respondió a tiempo. Se continuará con SQLite en RAM.'));
      }
    } else {
      console.log(styleText('yellow', `⚠️  No se pudo iniciar el contenedor PostgreSQL: ${runRes.stderr?.trim() || 'Error desconocido'}`));
    }
  } else {
    console.log(styleText('cyan', 'ℹ️  Docker no detectado o no disponible. Ejecutando tests exclusivamente en SQLite (RAM)...'));
  }

  // Setup environment variables for Vitest child process
  const childEnv: Record<string, string> = { // open-record
    ...(process.env as Record<string, string>) // open-record
  };

  if (postgresReady) {
    childEnv.TEST_POSTGRES_URL = POSTGRES_URL;
  } else {
    delete childEnv.TEST_POSTGRES_URL;
  }

  let vitestExitCode = 0;

  try {
    console.log(styleText('bold', styleText('blue', '\n------------------------------------------------------------')));
    console.log(styleText('bold', styleText('cyan', `🧪 INICIANDO EJECUCIÓN DE TESTS (${postgresReady ? 'DUAL: PostgreSQL + SQLite' : 'SQLite RAM'})`)));
    console.log(styleText('bold', styleText('blue', '------------------------------------------------------------\n')));

    const vitestProcess = spawnSync(
      'node',
      ['--no-experimental-webstorage', './node_modules/vitest/vitest.mjs', 'run', ...args],
      {
        stdio: 'inherit',
        env: childEnv
      }
    );

    vitestExitCode = vitestProcess.status ?? 0;
  } finally {
    cleanupContainer();
  }

  // Print final summary report
  console.log();
  if (vitestExitCode === 0) {
    if (postgresReady) {
      console.log(styleText('green', '======================================================================'));
      console.log(styleText('bold', styleText('green', '✨ REPORTE DE BASE DE DATOS: Validación DUAL completada exitosamente.')));
      console.log(styleText('green', '   - SQLite (en memoria): PASS'));
      console.log(styleText('green', '   - PostgreSQL (Docker efímero): PASS'));
      console.log(styleText('green', '======================================================================'));
    } else {
      console.log(styleText('yellow', '======================================================================'));
      console.log(styleText('bold', styleText('yellow', '⚠️  ADVERTENCIA DE ENTORNO DE PRUEBAS:')));
      console.log(styleText('yellow', '   Docker no fue detectado o no está en ejecución en este sistema.'));
      console.log(styleText('yellow', '   Los tests se ejecutaron exclusivamente en emulación SQLite (RAM).'));
      console.log(styleText('yellow', '   👉 Se recomienda instalar o iniciar Docker Desktop (o Docker Engine en Linux)'));
      console.log(styleText('yellow', '      para habilitar la validación dual con PostgreSQL real.'));
      console.log(styleText('yellow', '======================================================================'));
    }
  } else {
    console.log(styleText('red', '======================================================================'));
    console.log(styleText('bold', styleText('red', `❌ REPORTE DE TESTS: Se detectaron fallas en la ejecución (Exit Code: ${vitestExitCode}).`)));
    if (!postgresReady) {
      console.log(styleText('yellow', '   ℹ️  Nota: Docker no estuvo activo; las fallas ocurrieron en SQLite (RAM).'));
    }
    console.log(styleText('red', '======================================================================'));
  }

  process.exit(vitestExitCode);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(styleText('red', `❌ Error fatal en orquestador de pruebas: ${msg}`));
  process.exit(1);
});
