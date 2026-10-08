/**
 * @file update_supabase_db.ts
 * @description Script automático para acceder a los servidores Supabase y gestionar la base de datos.
 * 
 * UTILIDAD:
 * 1. Consultar si existen las tablas del juego en el servidor Supabase seleccionado.
 * 2. Si no existen, crear toda la base de datos de cero ejecutando el baseline_schema.
 * 3. Si existen, aplicar los parches (migraciones) necesarios de forma incremental y segura.
 * 
 * CARACTERÍSTICAS:
 * - Permite elegir actualizar TODOS los servidores o uno en particular (--server=<perfil> o --all).
 * - Cumple con las normativas env-multi-server-parser para extraer credenciales del .env maestro.
 * - Estándares Node.js 26+ (Explicit Resource Management con 'using', prefijos node:).
 */

import fsPromises from 'node:fs/promises';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import postgres from 'postgres';
import { buildDatabaseUrl, getValidatedServerConfigs, parseServerArguments } from '../lib/supabaseClient.ts';
import { safeResolve, safeJoin } from '@francogp/auditor';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const MIGRATIONS_DIR = safeResolve(process.cwd(), 'database/migrations');
const BASELINE_FILE = safeResolve(process.cwd(), 'database/migrations/20240416000000_baseline_schema.sql');
const UPDATE_TARGET_NODE_VERSION_LABEL = '26';

async function initSupabaseBaseline(sql: postgres.Sql, profile: string): Promise<void> {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('profiles', 'system_config', '_migrations')
  `;
  const existingTables = tables.map(t => t.table_name as string);
  console.log(styleText('cyan', `📊 Tablas detectadas en el esquema public: ${existingTables.length > 0 ? existingTables.join(', ') : 'Ninguna'}`));

  await using baseHandle = await fsPromises.open(BASELINE_FILE, 'r');
  const baselineContent = await baseHandle.readFile({ encoding: 'utf-8' });

  if (existingTables.length === 0) {
    console.log(styleText('yellow', `⚠️  Base de datos limpia detectada en [${profile}]. Inicializando esquema base desde cero...`));
    console.log(styleText('gray', `📄 Ejecutando: 20240416000000_baseline_schema.sql`));
    await sql.unsafe(baselineContent);
    console.log(styleText('green', `✅ Esquema base creado exitosamente en [${profile}].`));
    await sql`CREATE TABLE IF NOT EXISTS public._migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`INSERT INTO public._migrations (id) VALUES ('20240416000000_baseline_schema') ON CONFLICT DO NOTHING`;
  } else {
    console.log(styleText('green', `✅ Esquema base ya existe en [${profile}]. Procediendo a verificar parches...`));
    await sql`CREATE TABLE IF NOT EXISTS public._migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
  }
}

function adaptMigrationSqlToPostgres(sqlContent: string): string {
  let res = sqlContent.replace(/created_at NOT LIKE/g, "CAST(created_at AS TEXT) NOT LIKE");
  res = res.replace(/SET created_at = REPLACE\(created_at, ' ', 'T'\) \|\| 'Z'/g, "SET created_at = CAST(REPLACE(CAST(created_at AS TEXT), ' ', 'T') || 'Z' AS TIMESTAMPTZ)");
  res = res.replace(/DROP TABLE IF EXISTS events_config;/g, "DROP TABLE IF EXISTS events_config CASCADE;");
  res = res.replace(/WHERE user_id = '(local_[^']+)'/g, "WHERE user_id::text = '$1'");
  return res.replace(/ADD COLUMN (?!IF NOT EXISTS)/g, "ADD COLUMN IF NOT EXISTS ");
}

async function applySinglePostgresPatch(sql: postgres.Sql, migrationUid: string, filePath: string): Promise<boolean> {
  let migContent: string;
  try {
    await using migHandle = await fsPromises.open(filePath, 'r');
    migContent = await migHandle.readFile({ encoding: 'utf-8' });
  } catch (mErr: unknown) {
    console.error(styleText('red', `❌ Error al leer archivo de migración ${migrationUid}: ${(mErr as Error).message}`));
    return false;
  }

  const sqlContent = adaptMigrationSqlToPostgres(migContent);
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlContent);
      await tx`INSERT INTO public._migrations (id) VALUES (${migrationUid}) ON CONFLICT (id) DO NOTHING`;
    });
    console.log(styleText('green', `   ✅ Parche ${migrationUid} aplicado correctamente.`));
    return true;
  } catch (patchErr: unknown) {
    const pMsg = patchErr instanceof Error ? patchErr.message : String(patchErr);
    console.error(styleText('red', `❌ Error fatal al aplicar parche ${migrationUid}: ${pMsg}`));
    throw patchErr;
  }
}

async function applyPendingPostgresMigrations(sql: postgres.Sql, appliedIds: ReadonlySet<string>): Promise<number> {
  const files = (await fsPromises.readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql') && !f.includes('baseline_schema') && !f.includes('.sqlite.'))
    .sort((a, b) => a.localeCompare(b));

  let patchesApplied = 0;
  for (const filename of files) {
    const migrationId = filename.replace('.sql', '');
    if (!appliedIds.has(migrationId)) {
      console.log(styleText('cyan', `📦 Aplicando parche: ${filename}...`));
      const filePath = safeJoin(MIGRATIONS_DIR, filename);
      if (await applySinglePostgresPatch(sql, migrationId, filePath)) {
        patchesApplied++;
      }
    }
  }
  return patchesApplied;
}

async function syncSystemConfigVersions(sql: postgres.Sql, profile: string): Promise<void> {
  const allAppliedRows = await sql`SELECT id FROM public._migrations`;
  const versions = allAppliedRows
    .map(r => parseInt((r.id as string).split('_')[0] || '0'))
    .filter(v => v > 0);
  if (versions.length > 0) {
    const maxAppliedVersion = Math.max(...versions);
    console.log(styleText('cyan', `🔄 Sincronizando db_version en system_config de [${profile}] a la versión: ${maxAppliedVersion}`));
    await sql`
      INSERT INTO public.system_config (key, value) 
      VALUES ('db_version', ${maxAppliedVersion}::jsonb) 
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  let appVersion = 'v0.5.0';
  try {
    const verPath = safeResolve(process.cwd(), 'public/version.json');
    const verContent = JSON.parse(await fsPromises.readFile(verPath, 'utf-8')) as { version?: string };
    if (verContent?.version) appVersion = verContent.version;
  } catch {
    // catch-ok: public/version.json may not exist, fallback to base version
  }

  console.log(styleText('cyan', `🔄 Sincronizando app_version en system_config de [${profile}] a la versión: ${appVersion}`));
  await sql`
    INSERT INTO public.system_config (key, value) 
    VALUES ('app_version', ${appVersion}::jsonb) 
    ON CONFLICT (key) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

async function updateSingleProfileDb(profile: string, conf: Parameters<typeof buildDatabaseUrl>[0]): Promise<void> {
  console.log(styleText('bold', styleText('blue', `\n==================================================`)));
  console.log(styleText('bold', styleText('cyan', `🚀 INICIANDO ACTUALIZACIÓN DE BASE DE DATOS: [${profile}]`)));
  console.log(styleText('bold', styleText('blue', `==================================================`)));

  const dbUrl = buildDatabaseUrl(conf, profile);
  if (!dbUrl) {
    console.error(styleText('red', `❌ Error: No se pudo construir la URL de conexión Postgres para el perfil "${profile}".`));
    console.error(styleText('yellow', `👉 Asegúrate de tener SERVER_${profile}_POSTGRES_PASSWORD y SERVER_${profile}_SUPABASE_PUBLIC_URL en el .env`));
    return;
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${profile}]...`));
    await initSupabaseBaseline(sql, profile);

    const appliedRows = await sql`SELECT id FROM public._migrations`;
    const appliedIds = new Set(appliedRows.map(r => r.id as string));

    const patchesApplied = await applyPendingPostgresMigrations(sql, appliedIds);
    await syncSystemConfigVersions(sql, profile);

    if (patchesApplied === 0) {
      console.log(styleText('green', `✨ La base de datos de [${profile}] ya está completamente actualizada. No se requieren parches.`));
    } else {
      console.log(styleText('green', `✨ Proceso completado en [${profile}]: ${patchesApplied} parches aplicados exitosamente.`));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    console.error(styleText('red', `❌ Error al conectar o migrar la base de datos de [${profile}]: ${msg}`));
    throw err;
  } finally {
    await sql.end();
  }
}

export async function updateSupabaseDb(): Promise<void> {
  console.log(styleText('bold', `\n--- 🛡️ SUPABASE DATABASE MANAGER & MIGRATOR (Node.js ${UPDATE_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles, allAvailable } = await getValidatedServerConfigs();
  const args = process.argv.slice(2);
  const targetProfiles = parseServerArguments(args, baseProfiles, allAvailable);
  const serverArg = targetProfiles[0];
  const isAll = args.includes('--all') || args.includes('all');

  if (!serverArg && !isAll) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas actualizar indicando server=<perfil> o all.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run database:update server=server_franco'));
    console.log(styleText('gray', 'Ejemplo: npm run database:update all'));
    process.exit(1);
  }

  const profileToConfig = new Map<string, (typeof serverConfigs)[string]>();
  for (const [key, config] of Object.entries(serverConfigs)) {
    profileToConfig.set(key, config);
    if (config?.ID) profileToConfig.set(config.ID, config);
  }

  const failedProfiles: string[] = [];
  for (const profile of targetProfiles) {
    const conf = profileToConfig.get(profile);
    if (!conf) {
      console.error(styleText('red', `❌ Error: El perfil o ID "${profile}" no existe en el archivo .env.`));
      failedProfiles.push(profile);
      continue;
    }
    try {
      await updateSingleProfileDb(profile, conf);
    } catch {
      failedProfiles.push(profile);
    }
  }

  if (failedProfiles.length > 0) {
    console.error(styleText('bold', styleText('red', `\n❌ Falló la actualización de base de datos en los siguientes perfiles: ${failedProfiles.join(', ')}`)));
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('update_supabase_db.ts') ||
  process.argv[1].includes('update_supabase_db.ts')
);

if (isDirectRun) {
  updateSupabaseDb().catch((err: unknown) => {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    console.error(styleText('red', `❌ Error fatal: ${msg}`));
    process.exit(1);
  });
}
