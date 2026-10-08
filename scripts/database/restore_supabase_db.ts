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
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import postgres from 'postgres';
import { buildDatabaseUrl, getValidatedServerConfigs, parseServerArguments } from '../lib/supabaseClient.ts';
import { safeResolve, safeJoin } from '@francogp/auditor';

// Optimizar ejecución en ejecuciones sucesivas
enableCompileCache();

const BACKUPS_DIR = safeResolve(process.cwd(), 'database/backups');
const RESTORE_TARGET_NODE_VERSION_LABEL = '26';

export async function restoreSupabaseDb() {
  console.log(styleText('bold', `\n--- 🔄 SUPABASE DATABASE RESTORE MANAGER (Node.js ${RESTORE_TARGET_NODE_VERSION_LABEL}+) ---`));

  const { serverConfigs, baseProfiles, allAvailable } = await getValidatedServerConfigs();

  const args = process.argv.slice(2);
  const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : a);
  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      server: { type: 'string', short: 's' },
      file: { type: 'string', short: 'f' }
    },
    allowPositionals: true,
    strict: false
  });

  const targetProfiles = parseServerArguments(args, baseProfiles, allAvailable);
  const serverArg = targetProfiles[0];
  const fileArg = typeof values.file === 'string' ? values.file : positionals.find(p => p.endsWith('.json'));

  if (!serverArg) {
    console.log(styleText('yellow', '⚠️  Especifica qué servidor deseas restaurar indicando server=<perfil>.'));
    console.log(styleText('cyan', `Perfiles disponibles: ${allAvailable.join(', ')}`));
    console.log(styleText('gray', 'Ejemplo: npm run database:restore server=server_franco'));
    console.log(styleText('gray', 'Ejemplo con archivo: npm run database:restore server=server_franco file=database/backups/server_franco/backup_...json'));
    process.exit(1);
  }

  const profile = serverArg;
  const { findServerConfig } = await import('../lib/supabaseClient.ts');
  const conf = findServerConfig(serverConfigs, profile);
  if (!conf) {
    console.error(styleText('red', `❌ Error: El perfil o ID "${profile}" no existe en el archivo .env.`));
    process.exit(1);
  }

  const canonicalName = conf.ID || profile;

  console.log(styleText('bold', styleText('blue', `\n==================================================`)));
  console.log(styleText('bold', styleText('cyan', `🔄 INICIANDO RESTAURACIÓN DE BASE DE DATOS: [${canonicalName}]`)));
  console.log(styleText('bold', styleText('blue', `==================================================`)));

  const targetBackupPath = await resolveTargetBackupPath(canonicalName, fileArg);
  const backupObj = await loadBackupObject(targetBackupPath);
  const backupData = backupObj.data || {};
  const tableNames = Object.keys(backupData);
  console.log(styleText('cyan', `📦 Respaldo cargado en memoria: ${tableNames.length} tablas detectadas (Fecha de origen: ${backupObj.metadata?.timestamp || 'Desconocida'}).`));

  const dbUrl = buildDatabaseUrl(conf, canonicalName);
  if (!dbUrl || dbUrl.includes('placeholder')) {
    console.error(styleText('red', `❌ Error: URL de Postgres inválida o contraseña placeholder para "${canonicalName}".`));
    process.exit(1);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  console.log(styleText('cyan', `🔌 Conectando al servidor Postgres de [${canonicalName}]...`));
  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  try {
    const { existingTables, tableColumns, authTableColumns } = await fetchDestinationMetadata(sql);
    const backupUserIds = collectBackupUserIds(backupData, tableNames);
    const orderedTables = orderTablesByDependency(tableNames);
    const reverseOrderedTables = [...orderedTables].reverse();

    const authBackup = backupObj.auth;
    const hasAuthBackup = Boolean(authBackup && Array.isArray(authBackup.users) && authBackup.users.length > 0);

    console.log(styleText('yellow', `⚠️  Iniciando transacción de restauración. Se limpiarán las tablas existentes y se reinsertarán los datos del respaldo.`));

    await sql.begin(async (tx) => {
      await cleanDestinationTables(tx, reverseOrderedTables, existingTables);
      await cleanAuthTables(tx, hasAuthBackup);

      if (hasAuthBackup && authBackup?.users && authTableColumns.get('users')) {
        await restoreAuthUsers(tx, authBackup.users, authTableColumns.get('users')!);
      } else {
        await ensureFallbackAuthUsers(tx, backupUserIds);
      }

      if (hasAuthBackup && authBackup?.identities && authTableColumns.get('identities')) {
        await restoreAuthIdentities(tx, authBackup.identities, authTableColumns.get('identities')!);
      }

      console.log(styleText('green', `\n✨ Limpieza completada. Iniciando inserción de datos en orden jerárquico...`));
      const totalRestoredRows = await restoreTableData(tx, orderedTables, backupData, existingTables, tableColumns);
      await restoreRolePrivileges(tx);

      console.log(styleText('bold', styleText('green', `\n🎉 Transacción completada con éxito. ${totalRestoredRows} filas totales restauradas en [${canonicalName}].`)));
    });

    await sql.end();
  } catch (restErr: unknown) {
    console.error(styleText('red', `\n❌ Error fatal durante la restauración en [${canonicalName}]: ${(restErr as Error).message}`));
    console.error(styleText('yellow', `🔄 La transacción ha sido revertida (ROLLBACK automático). La base de datos mantiene su estado anterior.`));
    try {
      await sql.end();
    } catch {
      // catch-ok: Connection cleanup after rollback is best-effort
    }
    process.exit(1);
  }
}

interface BackupObject {
  metadata?: { profile?: string; timestamp?: string; totalTables?: number; totalRows?: number };
  data?: Record<string, Record<string, unknown>[]>;
  auth?: {
    users?: Record<string, unknown>[];
    identities?: Record<string, unknown>[];
  };
}

interface DestinationDbMetadata {
  existingTables: Set<string>;
  tableColumns: Map<string, Set<string>>;
  authTableColumns: Map<string, Set<string>>;
}

async function resolveTargetBackupPath(canonicalName: string, fileArg?: string): Promise<string> {
  if (fileArg) {
    console.log(styleText('green', `🏷️  Archivo de respaldo especificado manualmente: ${fileArg}`));
    return safeResolve(process.cwd(), fileArg);
  }

  const serverBackupDir = safeJoin(BACKUPS_DIR, canonicalName);
  console.log(styleText('cyan', `🔍 Buscando archivo de respaldo más reciente para [${canonicalName}] en database/backups/${canonicalName}/...`));
  try {
    const files = await fsPromises.readdir(serverBackupDir);
    const matching = files
      .filter(f => f.startsWith(`${canonicalName}_backup_`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (matching.length === 0 || matching[0] === undefined) {
      throw new Error(`No se encontraron archivos de respaldo automáticos para "${canonicalName}" en ${serverBackupDir}.`);
    }
    console.log(styleText('green', `🏷️  Archivo de respaldo detectado automáticamente: ${matching[0]}`));
    return safeJoin(serverBackupDir, matching[0]);
  } catch (rErr: unknown) {
    console.error(styleText('red', `❌ Error al inspeccionar el directorio de respaldos: ${(rErr as Error).message}`));
    process.exit(1);
  }
}

async function loadBackupObject(targetBackupPath: string): Promise<BackupObject> {
  try {
    await using backupHandle = await fsPromises.open(targetBackupPath, 'r');
    const backupContent = await backupHandle.readFile({ encoding: 'utf-8' });
    const backupObj = JSON.parse(backupContent) as BackupObject;
    if (!backupObj.data || typeof backupObj.data !== 'object') {
      throw new Error('El archivo JSON no tiene la propiedad "data" estructurada.');
    }
    return backupObj;
  } catch (jErr: unknown) {
    console.error(styleText('red', `❌ Error: Archivo de respaldo JSON inválido o corrupto: ${(jErr as Error).message}`));
    process.exit(1);
  }
}

async function fetchDestinationMetadata(sql: postgres.Sql): Promise<DestinationDbMetadata> {
  interface TableRow { table_name: string }
  const tables = await sql<TableRow[]>`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const existingTables = new Set(tables.map(t => t.table_name));

  interface ColumnRow { table_name: string; column_name: string }
  const cols = await sql<ColumnRow[]>`
    SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'
  `;
  const tableColumns = new Map<string, Set<string>>();
  for (const col of cols) {
    if (!tableColumns.has(col.table_name)) tableColumns.set(col.table_name, new Set());
    tableColumns.get(col.table_name)?.add(col.column_name);
  }

  interface AuthColumnRow { table_name: string; column_name: string; is_generated?: string; is_updatable?: string }
  const authCols = await sql<AuthColumnRow[]>`
    SELECT table_name, column_name, is_generated, is_updatable FROM information_schema.columns WHERE table_schema = 'auth'
  `;
  const authTableColumns = new Map<string, Set<string>>();
  for (const col of authCols) {
    if (col.is_generated === 'ALWAYS' || col.is_updatable === 'NO') continue;
    if (col.table_name === 'identities' && col.column_name === 'email') continue;
    if (!authTableColumns.has(col.table_name)) authTableColumns.set(col.table_name, new Set());
    authTableColumns.get(col.table_name)?.add(col.column_name);
  }

  return { existingTables, tableColumns, authTableColumns };
}

const UUID_STRING_LENGTH_EXPECTED = 36;
const USER_ID_KEYS = ['user_id', 'requester_id', 'addressee_id', 'sender_id', 'opponent_id', 'player_id', 'winner_id'] as const;

function collectBackupUserIds(backupData: Record<string, Record<string, unknown>[]>, tableNames: readonly string[]): Map<string, string> {
  const backupUserIds = new Map<string, string>();
  const profileRows = backupData['profiles'] || [];
  for (const r of profileRows) {
    const userId = String(r.id || r.user_id || '');
    const email = String(r.email || `user_${userId}@test.com`);
    if (userId.length === UUID_STRING_LENGTH_EXPECTED) backupUserIds.set(userId, email);
  }

  for (const tableName of tableNames) {
    const rows = backupData[tableName];
    if (!rows) continue;
    for (const r of rows) {
      for (const key of USER_ID_KEYS) {
        const val = String(r[key] || '');
        if (val.length === UUID_STRING_LENGTH_EXPECTED && !backupUserIds.has(val)) {
          backupUserIds.set(val, `user_${val}@test.com`);
        }
      }
    }
  }
  return backupUserIds;
}

const TABLE_PRIORITY_ORDER = ['system_config', '_migrations', 'events_config', 'profiles'] as const;
const TABLE_PRIORITY_INDEX_MAP: ReadonlyMap<string, number> = new Map(
  TABLE_PRIORITY_ORDER.map((name, idx) => [name, idx]),
);

function orderTablesByDependency(tableNames: readonly string[]): string[] {
  return [...tableNames].sort((a, b) => {
    const idxA = TABLE_PRIORITY_INDEX_MAP.get(a);
    const idxB = TABLE_PRIORITY_INDEX_MAP.get(b);
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.localeCompare(b);
  });
}

async function cleanDestinationTables(tx: postgres.TransactionSql, reverseOrderedTables: readonly string[], existingTables: ReadonlySet<string>): Promise<void> {
  for (const tableName of reverseOrderedTables) {
    if (!existingTables.has(tableName)) {
      if (tableName === 'passive_battle_results' && existingTables.has('passive_battle_reports')) {
        try {
          await tx.unsafe(`DELETE FROM public.passive_battle_reports`);
          console.log(styleText('gray', `   🧹 Tabla passive_battle_reports limpiada correctamente.`));
        } catch (dErr: unknown) {
          console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tabla passive_battle_reports: ${(dErr as Error).message}`));
        }
      }
      continue;
    }
    try {
      await tx.unsafe(`DELETE FROM public."${tableName}"`);
      console.log(styleText('gray', `   🧹 Tabla ${tableName} limpiada correctamente.`));
    } catch (dErr: unknown) {
      console.error(styleText('yellow', `   ⚠️ Advertencia al limpiar tabla ${tableName}: ${(dErr as Error).message}`));
    }
  }
}

async function cleanAuthTables(tx: postgres.TransactionSql, hasAuthBackup: boolean): Promise<void> {
  if (!hasAuthBackup) return;
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

const EMPTY_STRING_COLUMNS = [
  'confirmation_token', 'recovery_token', 'email_change_token_new',
  'email_change', 'email_change_token_current', 'phone_change',
  'phone_change_token', 'reauthentication_token'
] as const;
type EmptyStringColumn = (typeof EMPTY_STRING_COLUMNS)[number];
const EMPTY_STRING_COLS: ReadonlySet<EmptyStringColumn> = new Set(EMPTY_STRING_COLUMNS);

function parseJsonColumnSafe(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    // catch-ok: Fallback to raw value if JSON is malformed
    return val;
  }
}

function cleanAuthUserRow(u: Record<string, unknown>, usersCols: ReadonlySet<string>): Record<string, unknown> {
  const cleanUser: Record<string, unknown> = {};
  for (const col of usersCols) {
    const val = u[col];
    if ((col === 'raw_app_meta_data' || col === 'raw_user_meta_data') && val !== null && val !== undefined) {
      cleanUser[col] = parseJsonColumnSafe(val);
    } else if (EMPTY_STRING_COLS.has(col as EmptyStringColumn)) {
      cleanUser[col] = (val === null || val === undefined) ? '' : val;
    } else {
      cleanUser[col] = val !== undefined ? val : null;
    }
  }
  return cleanUser;
}

function cleanAuthIdentityRow(iden: Record<string, unknown>, idenCols: ReadonlySet<string>): Record<string, unknown> {
  const cleanIden: Record<string, unknown> = {};
  for (const col of idenCols) {
    const val = iden[col];
    if (col === 'identity_data' && val !== null && val !== undefined) {
      cleanIden[col] = parseJsonColumnSafe(val);
    } else {
      cleanIden[col] = val !== undefined ? val : null;
    }
  }
  return cleanIden;
}

async function restoreAuthUsers(tx: postgres.TransactionSql, users: Record<string, unknown>[], usersCols: ReadonlySet<string>): Promise<void> {
  console.log(styleText('cyan', `\n👤 Restaurando ${users.length} usuarios auténticos en auth.users...`));
  for (const u of users) {
    try {
      const cleanUser = cleanAuthUserRow(u, usersCols);
      const updateCols = Object.keys(cleanUser).filter(k => k !== 'id');
      await tx`INSERT INTO auth.users ${ tx(cleanUser) } ON CONFLICT (id) DO UPDATE SET ${ tx(cleanUser, ...updateCols) }`;
    } catch (authErr: unknown) {
      console.error(styleText('yellow', `   ⚠️ Advertencia al restaurar usuario ${u.id}: ${(authErr as Error).message}`));
    }
  }
}

async function ensureFallbackAuthUsers(tx: postgres.TransactionSql, backupUserIds: ReadonlyMap<string, string>): Promise<void> {
  console.log(styleText('cyan', `\n👤 Asegurando que todos los usuarios del respaldo (${backupUserIds.size}) existan en auth.users...`));
  for (const [userId, email] of backupUserIds.entries()) {
    try {
      await tx`
        INSERT INTO auth.users (id, email, aud, role, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
        VALUES (${userId}, ${email}, 'authenticated', 'authenticated', NOW(), '{}'::jsonb, '{}'::jsonb, false, false)
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (authErr: unknown) {
      console.error(styleText('yellow', `   ⚠️ Advertencia al asegurar usuario ${userId}: ${(authErr as Error).message}`));
    }
  }
}

async function restoreAuthIdentities(tx: postgres.TransactionSql, identities: Record<string, unknown>[], idenCols: ReadonlySet<string>): Promise<void> {
  console.log(styleText('cyan', `👤 Restaurando ${identities.length} identidades de usuario en auth.identities...`));
  for (const iden of identities) {
    try {
      const cleanIden = cleanAuthIdentityRow(iden, idenCols);
      const updateCols = Object.keys(cleanIden).filter(k => k !== 'id');
      await tx`INSERT INTO auth.identities ${ tx(cleanIden) } ON CONFLICT (id) DO UPDATE SET ${ tx(cleanIden, ...updateCols) }`;
    } catch (idenErr: unknown) {
      console.error(styleText('yellow', `   ⚠️ Advertencia al restaurar identidad ${iden.id}: ${(idenErr as Error).message}`));
    }
  }
}

async function restoreTableData(
  tx: postgres.TransactionSql,
  orderedTables: readonly string[],
  backupData: Record<string, Record<string, unknown>[]>,
  existingTables: ReadonlySet<string>,
  tableColumns: Map<string, Set<string>>
): Promise<number> {
  let totalRestored = 0;
  for (const tableName of orderedTables) {
    const rows = backupData[tableName];
    if (!rows || rows.length === 0) continue;

    if (!existingTables.has(tableName)) {
      if (tableName === 'passive_battle_results' && existingTables.has('passive_battle_reports')) {
        totalRestored += await restoreMappedPassiveBattle(tx, rows, tableColumns);
      }
      continue;
    }

    const validCols = tableColumns.get(tableName);
    const cleanedRows = validCols
      ? rows.map(r => {
          const c: Record<string, unknown> = {};
          for (const k of Object.keys(r)) { if (validCols.has(k)) c[k] = r[k]; }
          return c;
        })
      : rows;

    await tx`INSERT INTO public.${tx(tableName)} ${tx(cleanedRows)}`;
    totalRestored += cleanedRows.length;
    console.log(styleText('green', `   ✔️ ${tableName}: ${cleanedRows.length} filas restauradas exitosamente.`));
  }
  return totalRestored;
}

interface PassiveBattleReportRow {
  id: string;
  user_id: string;
  opponent_id: string;
  result: string;
  report_data: {
    attacker_elo_change: number;
    defender_elo_change: number;
  };
  created_at: string | null;
  [key: string]: unknown;
}

async function restoreMappedPassiveBattle(tx: postgres.TransactionSql, rows: Record<string, unknown>[], tableColumns: Map<string, Set<string>>): Promise<number> {
  const mapped: PassiveBattleReportRow[] = rows.map(r => ({
    id: r.id as string,
    user_id: r.attacker_id as string,
    opponent_id: r.defender_id as string,
    result: r.result as string,
    report_data: {
      attacker_elo_change: (r.attacker_elo_change as number) ?? 0,
      defender_elo_change: (r.defender_elo_change as number) ?? 0
    },
    created_at: (r.created_at as string) || null
  }));

  const validCols = tableColumns.get('passive_battle_reports');
  if (validCols) {
    for (const r of mapped) {
      for (const k of Object.keys(r)) {
        if (!validCols.has(k)) delete r[k];
      }
    }
  }

  await tx`INSERT INTO public.passive_battle_reports ${tx(mapped)}`;
  console.log(styleText('green', `   ✔️ passive_battle_reports: ${mapped.length} filas restauradas exitosamente.`));
  return mapped.length;
}

async function restoreRolePrivileges(tx: postgres.TransactionSql): Promise<void> {
  console.log(styleText('cyan', `\n🛡️ Asegurando privilegios de roles estándar en el esquema public...`));
  await tx`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`;
  await tx`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;`;
  await tx`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;`;
  await tx`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;`;
  await tx`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;`;
  await tx`GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;`;
  await tx`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;`;
  console.log(styleText('green', `   ✔️ Privilegios restablecidos correctamente.`));
}

// Permitir ejecución directa
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('restore_supabase_db.ts') ||
  process.argv[1].includes('restore_supabase_db.ts')
);

if (isDirectRun) {
  restoreSupabaseDb().catch((err) => {
    console.error(styleText('red', `❌ Error fatal: ${(err as Error).message}`));
    process.exit(1);
  });
}
