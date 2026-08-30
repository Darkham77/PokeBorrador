// fallow-ignore-file security-sink
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
import { buildDatabaseUrl, getValidatedServerConfigs } from '../lib/supabaseClient.ts';
import { safeResolve, safeJoin } from '../lib/safePath.ts';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const MIGRATIONS_DIR = safeResolve(process.cwd(), 'database/migrations');
const BASELINE_FILE = safeResolve(process.cwd(), 'database/migrations/20240416000000_baseline_schema.sql');
const DEFAULT_POSTGRES_PORT_LABEL_TEXT = '5432';
const UPDATE_TARGET_NODE_VERSION_LABEL = '26';

export async function updateSupabaseDb(): Promise<void> {
  console.log(styleText('bold', `\n--- 🛡️ SUPABASE DATABASE MANAGER & MIGRATOR (Node.js ${UPDATE_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles, allAvailable } = await getValidatedServerConfigs();

  const args = process.argv.slice(2);
  const { parseServerArguments } = await import('./backup_supabase_db.ts');
  const targetProfiles = parseServerArguments(args, baseProfiles, allAvailable);
  const serverArg = targetProfiles[0];
  const isAll = args.includes('--all') || args.includes('all');

  if (!serverArg && !isAll) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas actualizar indicando server=<perfil> o all.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:update server=nas_franco'));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:update all'));
    process.exit(1);
  }



  for (const profile of targetProfiles) {
    let conf = serverConfigs[profile];
    if (!conf) {
      const found = Object.keys(serverConfigs).find(p => serverConfigs[p]?.ID === profile);
      if (found) conf = serverConfigs[found];
    }
    if (!conf) {
      console.error(styleText('red', `❌ Error: El perfil o ID "${profile}" no existe en el archivo .env.`));
      continue;
    }

    console.log(styleText('bold', styleText('blue', `\n==================================================`)));
    console.log(styleText('bold', styleText('cyan', `🚀 INICIANDO ACTUALIZACIÓN DE BASE DE DATOS: [${profile}]`)));
    console.log(styleText('bold', styleText('blue', `==================================================`)));

    const dbUrl = buildDatabaseUrl(conf, profile);

    if (!dbUrl) {
      console.error(styleText('red', `❌ Error: No se pudo construir la URL de conexión Postgres para el perfil "${profile}".`));
      console.error(styleText('yellow', `👉 Asegúrate de tener SERVER_${profile}_POSTGRES_PASSWORD y SERVER_${profile}_SUPABASE_PUBLIC_URL en el .env`));
      continue;
    }

    const isSupabaseCloud = dbUrl.includes('.supabase.co');
    const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

    try {
      console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${profile}]...`));

      // 1. Consultar si existen las tablas del juego
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('profiles', 'system_config', '_migrations')
      `;

      const existingTables = tables.map(t => t.table_name as string);
      console.log(styleText('cyan', `📊 Tablas detectadas en el esquema public: ${existingTables.length > 0 ? existingTables.join(', ') : 'Ninguna'}`));

      let baselineContent = '';
      try {
        await using baseHandle = await fsPromises.open(BASELINE_FILE, 'r');
        baselineContent = await baseHandle.readFile({ encoding: 'utf-8' });
      } catch (baseErr: unknown) {
        console.error(styleText('red', `❌ Error al leer baseline_schema.sql: ${(baseErr as Error).message}`));
        process.exit(1);
      }

      if (existingTables.length === 0) {
        // 2. Si no existen, crear toda la base de datos de cero
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

      // 3. Si existe, aplicar los parches necesarios
      const appliedRows = await sql`SELECT id FROM public._migrations`;
      const appliedIds = new Set(appliedRows.map(r => r.id as string));

      const files = (await fsPromises.readdir(MIGRATIONS_DIR))
        .filter(f => f.endsWith('.sql') && !f.includes('baseline_schema') && !f.includes('.sqlite.'))
        .sort((a, b) => a.localeCompare(b));

      let patchesApplied = 0;

      for (const filename of files) {
        const migrationId = filename.replace('.sql', '');
        if (!appliedIds.has(migrationId)) {
          console.log(styleText('cyan', `📦 Aplicando parche: ${filename}...`));
          const filePath = safeJoin(MIGRATIONS_DIR, filename);
          let migContent = '';
          try {
            await using migHandle = await fsPromises.open(filePath, 'r');
            migContent = await migHandle.readFile({ encoding: 'utf-8' });
          } catch (mErr: unknown) {
            console.error(styleText('red', `❌ Error al leer archivo de migración ${filename}: ${(mErr as Error).message}`));
            continue;
          }

          let sqlContent = migContent;
          // Adaptar dialecto SQLite a Postgres para manipulación de texto sobre columnas TIMESTAMPTZ y dependencias CASCADE
          sqlContent = sqlContent.replace(/created_at NOT LIKE/g, "CAST(created_at AS TEXT) NOT LIKE");
          sqlContent = sqlContent.replace(/SET created_at = REPLACE\(created_at, ' ', 'T'\) \|\| 'Z'/g, "SET created_at = CAST(REPLACE(CAST(created_at AS TEXT), ' ', 'T') || 'Z' AS TIMESTAMPTZ)");
          sqlContent = sqlContent.replace(/DROP TABLE IF EXISTS events_config;/g, "DROP TABLE IF EXISTS events_config CASCADE;");
          sqlContent = sqlContent.replace(/WHERE user_id = '(local_[^']+)'/g, "WHERE user_id::text = '$1'");

          try {
            await sql.begin(async (tx) => {
              await tx.unsafe(sqlContent);
              await tx`INSERT INTO public._migrations (id) VALUES (${migrationId})`;
            });
            console.log(styleText('green', `   ✅ Parche ${migrationId} aplicado correctamente.`));
            patchesApplied++;
          } catch (patchErr: unknown) {
            const pMsg = patchErr instanceof Error ? patchErr.message : String(patchErr);
            if (pMsg.toLowerCase().includes('already exists') || pMsg.toLowerCase().includes('duplicate')) {
              console.log(styleText('yellow', `   ⚠️ Parche ${migrationId} ya estaba aplicado parcialmente (duplicado benigno). Registrando como completado.`));
              await sql`INSERT INTO public._migrations (id) VALUES (${migrationId}) ON CONFLICT DO NOTHING`;
              patchesApplied++;
            } else {
              throw patchErr;
            }
          }
        }
      }

      // 4. Sincronizar db_version en system_config con la migración más reciente aplicada
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

      // 5. Sincronizar app_version en system_config
      let appVersion = 'v0.5.0';
      try {
        const verPath = safeResolve(process.cwd(), 'public/version.json');
        const verContent = JSON.parse(await fsPromises.readFile(verPath, 'utf-8')) as { version?: string };
        if (verContent && verContent.version) {
          appVersion = verContent.version;
        }
      } catch (_e) {
        // Fallback
      }
      console.log(styleText('cyan', `🔄 Sincronizando app_version en system_config de [${profile}] a la versión: ${appVersion}`));
      await sql`
        INSERT INTO public.system_config (key, value) 
        VALUES ('app_version', ${appVersion}::jsonb) 
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;

      if (patchesApplied === 0) {
        console.log(styleText('green', `✨ La base de datos de [${profile}] ya está completamente actualizada. No se requieren parches.`));
      } else {
        console.log(styleText('green', `✨ Proceso completado en [${profile}]: ${patchesApplied} parches aplicados exitosamente.`));
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      console.error(styleText('red', `❌ Error al conectar o migrar la base de datos de [${profile}]: ${msg}`));
      if (msg.includes('password authentication failed') || msg.includes('placeholder')) {
        console.error(styleText('yellow', `👉 Advertencia: SERVER_${profile}_POSTGRES_PASSWORD parece ser un placeholder o es incorrecta.`));
        console.error(styleText('yellow', `👉 Configura la contraseña real en el archivo .env para poder aplicar migraciones en este servidor.`));
      }
      if (msg.toLowerCase().includes('tenant or user not found')) {
        console.error(styleText('yellow', `👉 Advertencia: El servidor proxy/pooler (Supavisor) rechazó la conexión por falta de Tenant ID.`));
        console.error(styleText('yellow', `👉 Configura SERVER_${profile}_DATABASE_URL con la cadena de conexión directa (ej. puerto ${DEFAULT_POSTGRES_PORT_LABEL_TEXT} directo o usuario postgres.<tenant>) en .env`));
      }
    } finally {
      await sql.end();
    }
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
