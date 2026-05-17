/**
 * @file restore_supabase_db.ts
 * @description Script automático para restaurar un respaldo completo (backup) en formato JSON
 * hacia la base de datos Supabase elegida (nube o NAS), extrayendo credenciales y Tenant ID del .env maestro.
 * 
 * UTILIDAD:
 * Permite al usuario elegir un servidor (--server=<perfil>) y un archivo de respaldo opcional (--file=<ruta>).
 * Si no se especifica --file, detecta automáticamente el respaldo más reciente para ese servidor en database/backups/.
 * Realiza una limpieza limpia en orden inverso y restaura transaccionalmente todas las filas.
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

export async function restoreSupabaseDb() {
  console.log(styleText('bold', '\n--- 🔄 SUPABASE DATABASE RESTORE MANAGER (Node.js 26+) ---'));

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

  let fileArg: string | undefined;
  const fileFlagIdx = args.findIndex(a => a === '--file');
  if (fileFlagIdx !== -1 && args[fileFlagIdx + 1] !== undefined) {
    fileArg = args[fileFlagIdx + 1];
  } else {
    fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
  }

  if (!serverArg) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas restaurar usando la bandera --server=<perfil>.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:restore -- --server=nas-franco'));
    console.log(styleText('gray', 'Ejemplo con archivo específico: npm run servers:db:restore -- --server=nas-franco --file=database/backups/nas-franco_backup_...json'));
    process.exit(1);
  }

  const profile = serverArg;
  let conf = serverConfigs[profile];
  if (!conf) {
    const found = Object.keys(serverConfigs).find(p => serverConfigs[p]?.ID === profile);
    if (found) conf = serverConfigs[found];
  }
  if (!conf) {
    console.error(styleText('red', `❌ Error: El perfil o ID "${profile}" no existe en el archivo .env.`));
    process.exit(1);
  }

  console.log(styleText('bold', styleText('blue', `\n==================================================`)));
  console.log(styleText('bold', styleText('cyan', `🔄 INICIANDO RESTAURACIÓN DE BASE DE DATOS: [${profile}]`)));
  console.log(styleText('bold', styleText('blue', `==================================================`)));

  // 1. Resolver archivo de respaldo a utilizar
  let targetBackupPath = fileArg ? path.resolve(process.cwd(), fileArg) : '';

  if (!targetBackupPath) {
    console.log(styleText('cyan', `🔍 Buscando archivo de respaldo más reciente para [${profile}] en database/backups/...`));
    try {
      const files = await fsPromises.readdir(BACKUPS_DIR);
      const matchingFiles = files
        .filter(f => f.startsWith(`${profile}_backup_`) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (matchingFiles.length === 0 || matchingFiles[0] === undefined) {
        console.error(styleText('red', `❌ Error: No se encontraron archivos de respaldo automáticos para "${profile}" en ${BACKUPS_DIR}.`));
        console.error(styleText('yellow', `👉 Ejecuta primero un respaldo con: npm run servers:db:backup -- --server=${profile} o especifica --file=<ruta>`));
        process.exit(1);
      }

      targetBackupPath = path.join(BACKUPS_DIR, matchingFiles[0]);
      console.log(styleText('green', `🏷️  Archivo de respaldo detectado automáticamente: ${matchingFiles[0]}`));
    } catch (rErr: unknown) {
      console.error(styleText('red', `❌ Error al inspeccionar el directorio de respaldos: ${(rErr as Error).message}`));
      process.exit(1);
    }
  } else {
    console.log(styleText('green', `🏷️  Archivo de respaldo especificado manualmente: ${fileArg}`));
  }

  // 2. Leer y validar archivo de respaldo
  let backupContent = '';
  try {
    await using backupHandle = await fsPromises.open(targetBackupPath, 'r');
    backupContent = await backupHandle.readFile({ encoding: 'utf-8' });
  } catch (bErr: unknown) {
    console.error(styleText('red', `❌ Error al leer el archivo de respaldo ${targetBackupPath}: ${(bErr as Error).message}`));
    process.exit(1);
  }

  interface BackupObject {
    metadata?: { profile?: string; timestamp?: string; totalTables?: number; totalRows?: number };
    data?: Record<string, Record<string, unknown>[]>;
  }

  let backupObj: BackupObject;
  try {
    backupObj = JSON.parse(backupContent) as BackupObject;
    if (!backupObj.data || typeof backupObj.data !== 'object') {
      throw new Error('El archivo JSON no tiene la propiedad "data" estructurada.');
    }
  } catch (jErr: unknown) {
    console.error(styleText('red', `❌ Error: Archivo de respaldo JSON inválido o corrupto: ${(jErr as Error).message}`));
    process.exit(1);
  }

  const backupData = backupObj.data;
  const tableNames = Object.keys(backupData);
  console.log(styleText('cyan', `📦 Respaldo cargado en memoria: ${tableNames.length} tablas detectadas (Fecha de origen: ${backupObj.metadata?.timestamp || 'Desconocida'}).`));

  // 3. Construir URL de Conexión Postgres
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
    process.exit(1);
  }

  if (dbUrl.includes('placeholder')) {
    console.error(styleText('red', `❌ Error: La contraseña para "${profile}" es un placeholder. No se puede restaurar.`));
    process.exit(1);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${profile}]...`));

  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    // 4. Ordenar tablas por prioridad de dependencias (Padres primero para INSERT, Hijos primero para DELETE)
    const priorityOrder = ['system_config', '_migrations', 'events_config', 'profiles'];
    const orderedTables = [...tableNames].sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    console.log(styleText('yellow', `⚠️  Iniciando transacción de restauración. Se limpiarán las tablas existentes y se reinsertarán los datos del respaldo.`));

    await sql.begin(async (tx) => {
      // Paso A: Limpiar tablas en orden inverso de dependencias (Hijos primero)
      const reverseOrderedTables = [...orderedTables].reverse();
      for (const tableName of reverseOrderedTables) {
        try {
          await tx.unsafe(`DELETE FROM public."${tableName}"`);
          console.log(styleText('gray', `   🧹 Tabla ${tableName} limpiada correctamente.`));
        } catch (dErr: unknown) {
          console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tabla ${tableName} (puede no existir o estar vacía): ${(dErr as Error).message}`));
        }
      }

      console.log(styleText('green', `\n✨ Limpieza completada. Iniciando inserción de datos en orden jerárquico...`));

      // Paso B: Insertar filas en orden directo jerárquico (Padres primero)
      let totalRestoredRows = 0;
      for (const tableName of orderedTables) {
        const rows = backupData[tableName];
        if (!rows || rows.length === 0) {
          console.log(styleText('gray', `   ⏩ ${tableName}: 0 filas en el respaldo. Omitiendo.`));
          continue;
        }

        try {
          await tx`INSERT INTO public.${tx(tableName)} ${tx(rows)}`;
          totalRestoredRows += rows.length;
          console.log(styleText('green', `   ✔️ ${tableName}: ${rows.length} filas restauradas exitosamente.`));
        } catch (iErr: unknown) {
          throw new Error(`Error al insertar en tabla "${tableName}": ${(iErr as Error).message}`);
        }
      }

      console.log(styleText('bold', styleText('green', `\n🎉 Transacción completada con éxito. ${totalRestoredRows} filas totales restauradas en [${profile}].`)));
    });

    await sql.end();
  } catch (restErr: unknown) {
    console.error(styleText('red', `\n❌ Error fatal durante la restauración en [${profile}]: ${(restErr as Error).message}`));
    console.error(styleText('yellow', `🔄 La transacción ha sido revertida (ROLLBACK automático). La base de datos mantiene su estado anterior.`));
    try { await sql.end(); } catch {}
    process.exit(1);
  }
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('restore_supabase_db.ts') ||
  process.argv[1].includes('restore_supabase_db.ts')
);

if (isDirectRun) {
  restoreSupabaseDb().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${err.message}`));
    process.exit(1);
  });
}
