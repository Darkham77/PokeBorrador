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
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import postgres from 'postgres';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const ENV_FILE = path.resolve(process.cwd(), '.env');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');
const BASELINE_FILE = path.resolve(process.cwd(), 'database/migrations/20240416000000_baseline_schema.sql');

export async function updateSupabaseDb() {
  console.log(styleText('bold', '\n--- 🛡️ SUPABASE DATABASE MANAGER & MIGRATOR (Node.js 26+) ---'));

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
  const serverConfigs: Record<string, Record<string, string>> = {};

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
        const parts = fullKey.split('_');
        const profile = parts[1];
        if (parts.length >= 3 && profile !== undefined) {
          const cleanKey = parts.slice(2).join('_');
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
  }

  const baseProfiles = Object.keys(serverConfigs);
  if (baseProfiles.length === 0) {
    console.error(styleText('red', '❌ Error: No se encontraron configuraciones de servidor (SERVER_<profile>_*) en el .env.'));
    process.exit(1);
  }

  const allAvailable = Array.from(new Set(baseProfiles.concat(Object.values(serverConfigs).map(c => c.ID).filter(Boolean) as string[])));

  // Parsear argumentos de la línea de comandos
  const args = process.argv.slice(2);
  let serverArg: string | undefined;
  const serverFlagIdx = args.findIndex(a => a === '--server');
  if (serverFlagIdx !== -1 && args[serverFlagIdx + 1] !== undefined) {
    serverArg = args[serverFlagIdx + 1];
  } else {
    serverArg = args.find(a => a.startsWith('--server='))?.split('=')[1];
  }
  const isAll = args.includes('--all');

  if (!serverArg && !isAll) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas actualizar usando la bandera --server=<perfil> o --all.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:update -- --server=cloud'));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:update -- --server=nas_franco'));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:update -- --all'));
    process.exit(1);
  }

  const targetProfiles = serverArg ? [serverArg] : baseProfiles;

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

    let dbUrl = conf.DATABASE_URL || conf.POSTGRES_URL || conf.PG_URL || '';
    if (!dbUrl) {
      const pass = conf.POSTGRES_PASSWORD || conf.DB_PASSWORD || '';
      const rawPubUrl = conf.SUPABASE_PUBLIC_URL || conf.SUPABASE_URL || conf.SITE_URL || conf.API_EXTERNAL_URL || conf.URL || '';
      if (rawPubUrl && pass) {
        try {
          const u = new URL(rawPubUrl);
          let host = u.hostname;
          let port = '5432';
          if (host.endsWith('.supabase.co')) {
            const ref = conf.TENANT_ID || conf.POOLER_TENANT_ID || host.split('.')[0] || 'postgres';
            host = `db.${host.split('.')[0]}.supabase.co`;
            console.log(styleText('cyan', `🏷️  Tenant ID / Project Ref detectado para [${profile}]: ${ref}`));
            dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
          } else {
            port = conf.POSTGRES_PORT || conf.DB_PORT || '5432';
            const tenant = conf.TENANT_ID || conf.POOLER_TENANT_ID || 'your-tenant-id';
            console.log(styleText('cyan', `🏷️  Tenant ID detectado para [${profile}]: ${tenant}`));
            dbUrl = `postgres://postgres.${tenant}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
          }
        } catch {
          // ignore
        }
      }
    }

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
        .filter(f => f.endsWith('.sql') && !f.includes('baseline_schema'))
        .sort((a, b) => a.localeCompare(b));

      let patchesApplied = 0;

      for (const filename of files) {
        const migrationId = filename.replace('.sql', '');
        if (!appliedIds.has(migrationId)) {
          console.log(styleText('cyan', `📦 Aplicando parche: ${filename}...`));
          const filePath = path.join(MIGRATIONS_DIR, filename);
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

      if (patchesApplied === 0) {
        console.log(styleText('green', `✨ La base de datos de [${profile}] ya está completamente actualizada. No se requieren parches.`));
      } else {
        console.log(styleText('green', `✨ Proceso completado en [${profile}]: ${patchesApplied} parches aplicados exitosamente.`));
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(styleText('red', `❌ Error al conectar o migrar la base de datos de [${profile}]: ${msg}`));
      if (msg.includes('password authentication failed') || msg.includes('placeholder')) {
        console.error(styleText('yellow', `👉 Advertencia: SERVER_${profile}_POSTGRES_PASSWORD parece ser un placeholder o es incorrecta.`));
        console.error(styleText('yellow', `👉 Configura la contraseña real en el archivo .env para poder aplicar migraciones en este servidor.`));
      }
      if (msg.toLowerCase().includes('tenant or user not found')) {
        console.error(styleText('yellow', `👉 Advertencia: El servidor proxy/pooler (Supavisor) rechazó la conexión por falta de Tenant ID.`));
        console.error(styleText('yellow', `👉 Configura SERVER_${profile}_DATABASE_URL con la cadena de conexión directa (ej. puerto 5432 directo o usuario postgres.<tenant>) en .env`));
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
  updateSupabaseDb().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${err.message}`));
    process.exit(1);
  });
}
