// fallow-ignore-file security-sink
/**
 * @file backup_supabase_db.ts
 * @description Script automático para descargar un respaldo completo (backup) en formato JSON
 * de la base de datos Supabase elegida (nube o NAS), extrayendo credenciales y Tenant ID del .env maestro.
 * 
 * UTILIDAD:
 * Permite al usuario elegir un servidor (--server=<perfil> o --all) y generar un archivo
 * estructurado con el contenido de todas las tablas del esquema public.
 * 
 * CUMPLE CON:
 * - Regla de Aislamiento y Parseo Multi-Servidor (env-multi-server-parser).
 * - Estándares Node.js 26+ (Explicit Resource Management con 'using', prefijos node:).
 * - Arquitectura Zero-Warning y Zero-Any.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import postgres from 'postgres';
import { readAndParseEnv, buildDatabaseUrl } from '../lib/supabaseClient.ts';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const BACKUP_TARGET_NODE_VERSION_LABEL = '26';

const BACKUPS_DIR = path.resolve(process.cwd(), 'database/backups');

export function parseServerArguments(args: string[], baseProfiles: string[], allAvailable: string[]): string[] {
  let serverArg: string | undefined
  const serverFlagIdx = args.findIndex(a => a === '--server')
  if (serverFlagIdx !== -1 && args[serverFlagIdx + 1] !== undefined) {
    serverArg = args[serverFlagIdx + 1]
  } else {
    serverArg = args.find(a => a.startsWith('--server='))?.split('=')[1]
  }
  const isAll = args.includes('--all')

  if (!serverArg && !isAll) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas respaldar usando la bandera --server=<perfil> o --all.'))
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`))
    process.exit(1)
  }

  return serverArg ? [serverArg] : baseProfiles
}

export async function backupSupabaseDb() {
  console.log(styleText('bold', `\n--- 📦 SUPABASE DATABASE BACKUP MANAGER (Node.js ${BACKUP_TARGET_NODE_VERSION_LABEL}+) ---`))

  const serverConfigs = await readAndParseEnv()
  const baseProfiles = Object.keys(serverConfigs)
  if (baseProfiles.length === 0) {
    console.error(styleText('red', '❌ Error: No se encontraron configuraciones de servidor en el .env.'))
    process.exit(1)
  }

  const allAvailable = Array.from(new Set(baseProfiles.concat(Object.values(serverConfigs).map(c => c.ID).filter(Boolean) as string[])))
  const targetProfiles = parseServerArguments(process.argv.slice(2), baseProfiles, allAvailable)

  // Asegurar que el directorio de respaldos exista
  await fsPromises.mkdir(BACKUPS_DIR, { recursive: true });

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

    const canonicalName = conf.ID || profile;

    console.log(styleText('bold', styleText('blue', `\n==================================================`)));
    console.log(styleText('bold', styleText('cyan', `📥 INICIANDO RESPALDO DE BASE DE DATOS: [${canonicalName}]`)));
    console.log(styleText('bold', styleText('blue', `==================================================`)));

    const serverBackupDir = path.join(BACKUPS_DIR, canonicalName);
    await fsPromises.mkdir(serverBackupDir, { recursive: true });

    const dbUrl = buildDatabaseUrl(conf, canonicalName);

    if (!dbUrl) {
      console.error(styleText('red', `❌ Error: No se pudo construir la URL de conexión Postgres para el perfil "${canonicalName}".`));
      console.error(styleText('yellow', `👉 Asegúrate de tener SERVER_${profile}_POSTGRES_PASSWORD y SERVER_${profile}_SUPABASE_PUBLIC_URL en el .env`));
      continue;
    }

    if (dbUrl.includes('placeholder')) {
      console.log(styleText('yellow', `⚠️  Advertencia: La contraseña para [${canonicalName}] es un placeholder. Omitiendo respaldo.`));
      continue;
    }

    const isSupabaseCloud = dbUrl.includes('.supabase.co');
    console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${canonicalName}]...`));

    const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

    try {
      // 1. Obtener lista de tablas del esquema public
      interface TableRow { table_name: string }
      const tables = await sql<TableRow[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      if (tables.length === 0) {
        console.log(styleText('yellow', `⚠️  No se encontraron tablas en el esquema public de [${canonicalName}].`));
        await sql.end();
        continue;
      }

      console.log(styleText('green', `📊 Se detectaron ${tables.length} tablas en [${canonicalName}]. Iniciando descarga...`));

      const backupData: Record<string, Record<string, unknown>[]> = {};
      let totalRows = 0;

      for (const t of tables) {
        const tableName = t.table_name;
        try {
          const rows = await sql.unsafe(`SELECT * FROM public."${tableName}"`);
          backupData[tableName] = rows as Record<string, unknown>[];
          totalRows += rows.length;
          console.log(styleText('gray', `   ✔️ ${tableName}: ${rows.length} filas respaldadas.`));
        } catch (tErr: unknown) {
          console.error(styleText('red', `   ❌ Error al respaldar tabla ${tableName}: ${(tErr as Error).message}`));
        }
      }

      // 1.5. Respaldar datos de autenticación (auth.users y auth.identities)
      let authUsers: Record<string, unknown>[] = [];
      let authIdentities: Record<string, unknown>[] = [];

      try {
        console.log(styleText('cyan', '👤 Descargando credenciales de usuario desde auth.users...'));
        const usersRes = await sql`
          SELECT *
          FROM auth.users;
        `;
        authUsers = usersRes as Record<string, unknown>[];
        console.log(styleText('gray', `   ✔️ auth.users: ${authUsers.length} usuarios respaldados.`));
      } catch (authErr: unknown) {
        console.error(styleText('yellow', `   ⚠️ Advertencia: No se pudo respaldar auth.users: ${(authErr as Error).message}`));
      }

      try {
        console.log(styleText('cyan', '👤 Descargando identidades de usuario desde auth.identities...'));
        const idRes = await sql`
          SELECT *
          FROM auth.identities;
        `;
        authIdentities = idRes as Record<string, unknown>[];
        console.log(styleText('gray', `   ✔️ auth.identities: ${authIdentities.length} identidades respaldadas.`));
      } catch (authErr: unknown) {
        console.error(styleText('yellow', `   ⚠️ Advertencia: No se pudo respaldar auth.identities: ${(authErr as Error).message}`));
      }

      await sql.end();

      // 2. Guardar en archivo JSON
      const timestamp = Temporal.Now.instant().toString().replace(/[:.]/g, '-');
      const backupFilename = `${canonicalName}_backup_${timestamp}.json`;
      const backupFilePath = path.join(serverBackupDir, backupFilename);

      const fullBackupObject = {
        metadata: {
          profile: canonicalName,
          timestamp: Temporal.Now.instant().toString(),
          totalTables: tables.length,
          totalRows
        },
        data: backupData,
        auth: {
          users: authUsers,
          identities: authIdentities
        }
      };

      await fsPromises.writeFile(backupFilePath, JSON.stringify(fullBackupObject, null, 2), 'utf-8');

      console.log(styleText('green', `\n✨ Respaldo completado exitosamente en [${canonicalName}]:`));
      console.log(styleText('cyan', `📂 Archivo guardado en: ${backupFilePath}`));
      console.log(styleText('cyan', `📈 Resumen: ${tables.length} tablas, ${totalRows} filas totales.`));

    } catch (dbErr: unknown) {
      console.error(styleText('red', `❌ Error al conectar o respaldar la base de datos de [${canonicalName}]: ${(dbErr as Error).message}`));
      try { await sql.end(); } catch { /* ignore */ }
    }
  }
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('backup_supabase_db.ts') ||
  process.argv[1].includes('backup_supabase_db.ts')
);

if (isDirectRun) {
  backupSupabaseDb().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${(err as Error).message}`));
    process.exit(1);
  });
}
