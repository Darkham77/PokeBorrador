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
import { readAndParseEnv, buildDatabaseUrl } from './lib/supabaseClient.ts';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const BACKUPS_DIR = path.resolve(process.cwd(), 'database/backups');

export async function restoreSupabaseDb() {
  console.log(styleText('bold', '\n--- 🔄 SUPABASE DATABASE RESTORE MANAGER (Node.js 26+) ---'));

  const serverConfigs = await readAndParseEnv();
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
    console.log(styleText('gray', 'Ejemplo: npm run servers:db:restore -- --server=nas_franco'));
    console.log(styleText('gray', 'Ejemplo con archivo específico: npm run servers:db:restore -- --server=nas_franco --file=database/backups/nas_franco_backup_...json'));
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

  const canonicalName = conf.ID || profile;

  console.log(styleText('bold', styleText('blue', `\n==================================================`)));
  console.log(styleText('bold', styleText('cyan', `🔄 INICIANDO RESTAURACIÓN DE BASE DE DATOS: [${canonicalName}]`)));
  console.log(styleText('bold', styleText('blue', `==================================================`)));

  // 1. Resolver archivo de respaldo a utilizar
  let targetBackupPath = fileArg ? path.resolve(process.cwd(), fileArg) : '';

  if (!targetBackupPath) {
    const serverBackupDir = path.join(BACKUPS_DIR, canonicalName);
    console.log(styleText('cyan', `🔍 Buscando archivo de respaldo más reciente para [${canonicalName}] en database/backups/${canonicalName}/...`));
    try {
      const files = await fsPromises.readdir(serverBackupDir);
      const matchingFiles = files
        .filter(f => f.startsWith(`${canonicalName}_backup_`) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (matchingFiles.length === 0 || matchingFiles[0] === undefined) {
        console.error(styleText('red', `❌ Error: No se encontraron archivos de respaldo automáticos para "${canonicalName}" en ${serverBackupDir}.`));
        console.error(styleText('yellow', `👉 Ejecuta primero un respaldo con: npm run servers:db:backup -- --server=${canonicalName} o especifica --file=<ruta>`));
        process.exit(1);
      }

      targetBackupPath = path.join(serverBackupDir, matchingFiles[0]);
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
    auth?: {
      users?: Record<string, unknown>[];
      identities?: Record<string, unknown>[];
    };
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
  const dbUrl = buildDatabaseUrl(conf, canonicalName);

  if (!dbUrl) {
    console.error(styleText('red', `❌ Error: No se pudo construir la URL de conexión Postgres para el perfil "${canonicalName}".`));
    console.error(styleText('yellow', `👉 Asegúrate de tener SERVER_${profile}_POSTGRES_PASSWORD y SERVER_${profile}_SUPABASE_PUBLIC_URL en el .env`));
    process.exit(1);
  }

  if (dbUrl.includes('placeholder')) {
    console.error(styleText('red', `❌ Error: La contraseña para "${canonicalName}" es un placeholder. No se puede restaurar.`));
    process.exit(1);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${canonicalName}]...`));

  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    // 3.5. Obtener lista de tablas existentes en el destino
    interface TableRow { table_name: string }
    interface LegacyPassiveBattleResult {
      id: string;
      attacker_id: string;
      defender_id: string;
      result: string;
      attacker_elo_change?: number;
      defender_elo_change?: number;
      created_at: string;
    }

    const tables = await sql<TableRow[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const existingTables = new Set(tables.map(t => t.table_name));

    interface ColumnRow { table_name: string; column_name: string }
    const cols = await sql<ColumnRow[]>`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `;
    const tableColumns = new Map<string, Set<string>>();
    for (const col of cols) {
      if (!tableColumns.has(col.table_name)) {
        tableColumns.set(col.table_name, new Set());
      }
      tableColumns.get(col.table_name)?.add(col.column_name);
    }

    interface AuthColumnRow { table_name: string; column_name: string; is_generated?: string; is_updatable?: string }
    const authCols = await sql<AuthColumnRow[]>`
      SELECT table_name, column_name, is_generated, is_updatable
      FROM information_schema.columns 
      WHERE table_schema = 'auth'
    `;
    const authTableColumns = new Map<string, Set<string>>();
    for (const col of authCols) {
      if (col.is_generated === 'ALWAYS') continue;
      if (col.is_updatable === 'NO') continue;
      if (col.table_name === 'identities' && col.column_name === 'email') continue;
      if (!authTableColumns.has(col.table_name)) {
        authTableColumns.set(col.table_name, new Set());
      }
      authTableColumns.get(col.table_name)?.add(col.column_name);
    }

    // Recolectar todos los user_ids del respaldo para asegurar su existencia en auth.users
    const backupUserIds = new Map<string, string>();
    const profileRows = backupData['profiles'] || [];
    for (const r of profileRows) {
      const userId = String(r.id || r.user_id || '');
      const email = String(r.email || `user_${userId}@test.com`);
      if (userId && userId.length === 36) {
        backupUserIds.set(userId, email);
      }
    }

    const userIdKeys = ['user_id', 'requester_id', 'addressee_id', 'sender_id', 'opponent_id', 'player_id', 'winner_id'];
    for (const tableName of tableNames) {
      const rows = backupData[tableName];
      if (!rows) continue;
      for (const r of rows) {
        for (const key of userIdKeys) {
          const val = String(r[key] || '');
          if (val && val.length === 36 && !backupUserIds.has(val)) {
            backupUserIds.set(val, `user_${val}@test.com`);
          }
        }
      }
    }

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
      // Paso A: Limpiar tablas públicas en orden inverso de dependencias (Hijos primero)
      const reverseOrderedTables = [...orderedTables].reverse();
      for (const tableName of reverseOrderedTables) {
        if (!existingTables.has(tableName)) {
          if (tableName === 'passive_battle_results' && existingTables.has('passive_battle_reports')) {
            try {
              await tx.unsafe(`DELETE FROM public.passive_battle_reports`);
              console.log(styleText('gray', `   🧹 Tabla passive_battle_reports (mapeada de passive_battle_results) limpiada correctamente.`));
            } catch (dErr: unknown) {
              console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tabla passive_battle_reports: ${(dErr as Error).message}`));
            }
          } else {
            console.log(styleText('yellow', `   ⚠️ Advertencia: La tabla "${tableName}" del respaldo no existe en el destino. Se omitirá la limpieza.`));
          }
          continue;
        }

        try {
          await tx.unsafe(`DELETE FROM public."${tableName}"`);
          console.log(styleText('gray', `   🧹 Tabla ${tableName} limpiada correctamente.`));
        } catch (dErr: unknown) {
          console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tabla ${tableName} (puede no existir o estar vacía): ${(dErr as Error).message}`));
        }
      }

      // Paso A.2: Limpiar tablas de auth si existe respaldo de auth para evitar conflictos
      const authBackup = backupObj.auth;
      const hasAuthBackup = authBackup && Array.isArray(authBackup.users) && authBackup.users.length > 0;
      if (hasAuthBackup) {
        try {
          console.log(styleText('cyan', `\n🧹 Limpiando tablas de autenticación en destino...`));
          await tx`DELETE FROM auth.identities`;
          console.log(styleText('gray', `   🧹 Tabla auth.identities limpiada correctamente.`));
          await tx`DELETE FROM auth.users`;
          console.log(styleText('gray', `   🧹 Tabla auth.users limpiada correctamente.`));
        } catch (cleanAuthErr: unknown) {
          console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tablas de auth: ${(cleanAuthErr as Error).message}`));
        }
      }

      // Paso A.5: Asegurar la existencia de todos los usuarios en auth.users y auth.identities
      if (hasAuthBackup && authBackup && Array.isArray(authBackup.users)) {
        console.log(styleText('cyan', `\n👤 Restaurando ${authBackup.users.length} usuarios auténticos en auth.users...`));
        const usersCols = authTableColumns.get('users');
        const emptyStringCols = new Set([
          'confirmation_token',
          'recovery_token',
          'email_change_token_new',
          'email_change',
          'email_change_token_current',
          'phone_change',
          'phone_change_token',
          'reauthentication_token'
        ]);

        if (usersCols) {
          for (const u of authBackup.users) {
            try {
              const cleanUser: Record<string, unknown> = {};
              for (const col of usersCols) {
                const val = u[col];
                if ((col === 'raw_app_meta_data' || col === 'raw_user_meta_data') && val !== null && val !== undefined) {
                  try {
                    cleanUser[col] = typeof val === 'string' ? JSON.parse(val) : val;
                  } catch {
                    cleanUser[col] = val;
                  }
                } else if (emptyStringCols.has(col)) {
                  cleanUser[col] = (val === null || val === undefined) ? '' : val;
                } else {
                  cleanUser[col] = val !== undefined ? val : null;
                }
              }
              const updateCols = Object.keys(cleanUser).filter(k => k !== 'id');
              await tx`
                INSERT INTO auth.users ${ tx(cleanUser) }
                ON CONFLICT (id) DO UPDATE SET ${ tx(cleanUser, ...updateCols) }
              `;
            } catch (authErr: unknown) {
              console.error(styleText('yellow', `   ⚠️ Advertencia al restaurar usuario ${u.id} (${u.email}): ${(authErr as Error).message}`));
            }
          }
        } else {
          console.error(styleText('red', '❌ Error: No se pudo obtener la definición de columnas para auth.users.'));
        }
      } else {
        console.log(styleText('cyan', `\n👤 Asegurando que todos los usuarios del respaldo (${backupUserIds.size}) existan en auth.users...`));
        for (const [userId, email] of backupUserIds.entries()) {
          try {
            await tx`
              INSERT INTO auth.users (id, email, aud, role, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
              VALUES (${userId}, ${email}, 'authenticated', 'authenticated', NOW(), '{}'::jsonb, '{}'::jsonb, false, false)
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (authErr: unknown) {
            console.error(styleText('yellow', `   ⚠️ Advertencia al asegurar usuario ${userId} (${email}): ${(authErr as Error).message}`));
          }
        }
      }

      // Restaurar identidades si existen en el backup
      if (hasAuthBackup && authBackup && Array.isArray(authBackup.identities)) {
        console.log(styleText('cyan', `👤 Restaurando ${authBackup.identities.length} identidades de usuario en auth.identities...`));
        const idenCols = authTableColumns.get('identities');
        if (idenCols) {
          for (const iden of authBackup.identities) {
            try {
              const cleanIden: Record<string, unknown> = {};
              for (const col of idenCols) {
                const val = iden[col];
                if (col === 'identity_data' && val !== null && val !== undefined) {
                  try {
                    cleanIden[col] = typeof val === 'string' ? JSON.parse(val) : val;
                  } catch {
                    cleanIden[col] = val;
                  }
                } else {
                  cleanIden[col] = val !== undefined ? val : null;
                }
              }
              const updateCols = Object.keys(cleanIden).filter(k => k !== 'id');
              await tx`
                INSERT INTO auth.identities ${ tx(cleanIden) }
                ON CONFLICT (id) DO UPDATE SET ${ tx(cleanIden, ...updateCols) }
              `;
            } catch (idenErr: unknown) {
              console.error(styleText('yellow', `   ⚠️ Advertencia al restaurar identidad ${iden.id}: ${(idenErr as Error).message}`));
            }
          }
        } else {
          console.error(styleText('red', '❌ Error: No se pudo obtener la definición de columnas para auth.identities.'));
        }
      }

      console.log(styleText('green', `\n✨ Limpieza completada. Iniciando inserción de datos en orden jerárquico...`));

      // Paso B: Insertar filas en orden directo jerárquico (Padres primero)
      let totalRestoredRows = 0;
      for (const tableName of orderedTables) {
        let rows = backupData[tableName];
        if (!rows || rows.length === 0) {
          console.log(styleText('gray', `   ⏩ ${tableName}: 0 filas en el respaldo. Omitiendo.`));
          continue;
        }

        if (!existingTables.has(tableName)) {
          if (tableName === 'passive_battle_results' && existingTables.has('passive_battle_reports')) {
            console.log(styleText('cyan', `   🔄 Mapeando passive_battle_results a passive_battle_reports (${rows.length} filas)...`));
            const mappedRows = (rows as unknown as LegacyPassiveBattleResult[]).map((r) => ({
              id: r.id,
              user_id: r.attacker_id,
              opponent_id: r.defender_id,
              result: r.result,
              report_data: {
                attacker_elo_change: r.attacker_elo_change ?? 0,
                defender_elo_change: r.defender_elo_change ?? 0
              },
              created_at: r.created_at
            }));

            // Podar columnas inválidas para passive_battle_reports
            const validCols = tableColumns.get('passive_battle_reports');
            if (validCols) {
              for (const r of mappedRows) {
                for (const key of Object.keys(r)) {
                  if (!validCols.has(key)) {
                    delete (r as Record<string, unknown>)[key];
                  }
                }
              }
            }

            try {
              await tx`INSERT INTO public.passive_battle_reports ${tx(mappedRows)}`;
              totalRestoredRows += mappedRows.length;
              console.log(styleText('green', `   ✔️ passive_battle_reports (mapeada de passive_battle_results): ${mappedRows.length} filas restauradas exitosamente.`));
            } catch (iErr: unknown) {
              throw new Error(`Error al insertar en tabla adaptada "passive_battle_reports": ${(iErr as Error).message}`);
            }
          } else {
            console.log(styleText('yellow', `   ⏩ Tabla "${tableName}" no existe en el destino y no tiene mapeo. Omitiendo inserción.`));
          }
          continue;
        }

        // Podar columnas inválidas del respaldo que no existen en el destino
        const validCols = tableColumns.get(tableName);
        if (validCols) {
          rows = rows.map((r: Record<string, unknown>) => {
            const cleanRow: Record<string, unknown> = {};
            for (const key of Object.keys(r)) {
              if (validCols.has(key)) {
                cleanRow[key] = r[key];
              }
            }
            return cleanRow;
          });
        }

        try {
          await tx`INSERT INTO public.${tx(tableName)} ${tx(rows)}`;
          totalRestoredRows += rows.length;
          console.log(styleText('green', `   ✔️ ${tableName}: ${rows.length} filas restauradas exitosamente.`));
        } catch (iErr: unknown) {
          throw new Error(`Error al insertar en tabla "${tableName}": ${(iErr as Error).message}`);
        }
      }

      console.log(styleText('cyan', `\n🛡️ Asegurando privilegios de roles estándar en el esquema public...`));
      await tx`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`;
      await tx`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;`;
      await tx`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;`;
      await tx`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;`;
      await tx`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;`;
      await tx`GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;`;
      await tx`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;`;
      console.log(styleText('green', `   ✔️ Privilegios restablecidos correctamente.`));

      console.log(styleText('bold', styleText('green', `\n🎉 Transacción completada con éxito. ${totalRestoredRows} filas totales restauradas en [${canonicalName}].`)));
    });

    await sql.end();
  } catch (restErr: unknown) {
    console.error(styleText('red', `\n❌ Error fatal durante la restauración en [${canonicalName}]: ${(restErr as Error).message}`));
    console.error(styleText('yellow', `🔄 La transacción ha sido revertida (ROLLBACK automático). La base de datos mantiene su estado anterior.`));
    try { await sql.end(); } catch { /* ignore */ }
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
