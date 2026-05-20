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

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const ENV_FILE = path.resolve(process.cwd(), '.env');
const BACKUPS_DIR = path.resolve(process.cwd(), 'database/backups');

export async function backupSupabaseDb() {
  console.log(styleText('bold', '\n--- 📦 SUPABASE DATABASE BACKUP MANAGER (Node.js 26+) ---'));

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
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas respaldar usando la bandera --server=<perfil> o --all.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:backup -- --server=cloud'));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:backup -- --server=nas-franco'));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:backup -- --all'));
    process.exit(1);
  }

  const targetProfiles = serverArg ? [serverArg] : baseProfiles;

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
            console.log(styleText('cyan', `🏷️  Tenant ID / Project Ref detectado para [${canonicalName}]: ${ref}`));
            dbUrl = `postgres://postgres:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
          } else {
            port = conf.POSTGRES_PORT || conf.DB_PORT || '5432';
            const tenant = conf.TENANT_ID || conf.POOLER_TENANT_ID || 'your-tenant-id';
            console.log(styleText('cyan', `🏷️  Tenant ID detectado para [${canonicalName}]: ${tenant}`));
            dbUrl = `postgres://postgres.${tenant}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
          }
        } catch {
          // ignore
        }
      }
    }

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
        authUsers = usersRes as unknown as Record<string, unknown>[];
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
        authIdentities = idRes as unknown as Record<string, unknown>[];
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
    console.error(styleText('red', `❌ Error fatal: ${err.message}`));
    process.exit(1);
  });
}
