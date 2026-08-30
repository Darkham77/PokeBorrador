// fallow-ignore-file security-sink
/**
 * scripts/maintenance/diagnose_account.ts
 * 
 * DIAGNÓSTICO INTEGRAL DE CUENTAS (Node.js 26+)
 * Descarga o carga los datos de guardado de uno o TODOS los entrenadores desde un servidor Supabase (remoto),
 * base de datos SQLite local o archivo de respaldo JSON, y ejecuta la batería oficial de
 * verificaciones y diagnósticos del proyecto reutilizando los módulos canónicos existentes:
 * 
 * 1. Estructura y Schema Valibot (`validateSaveData` en `src/logic/validation/schemas.ts`).
 * 2. Legalidad de Pokémon (`checkPokemonLegality` en `src/logic/pokemon/pokemonLegality.ts`).
 * 3. Catálogo de Ítems e Inventario (`SHOP_ITEMS` en `src/data/inventory/items.ts`).
 * 4. Simulación de Migraciones SQL en Memoria (`initTestDatabaseSchema` y `DATABASE_MIGRATIONS`).
 * 
 * Uso:
 *   # Diagnosticar TODAS las cuentas de un servidor:
 *   npm run db:diagnose-account server=server_franco all
 * 
 *   # Diagnosticar TODAS las cuentas de un respaldo JSON:
 *   npm run db:diagnose-account file=database/backups/server_franco/backup.json all
 * 
 *   # Diagnosticar una cuenta específica:
 *   npm run db:diagnose-account server=server_franco user=kenviota@gmail.com
 *   npm run db:diagnose-account file=database/backups/server_franco/backup.json user=Angianemar
 *   npm run db:diagnose-account user=local_ash
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { parseArgs, styleText } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';

import { validateSaveData } from '../../src/logic/validation/schemas.ts';
import { checkPokemonLegality } from '../../src/logic/pokemon/pokemonLegality.ts';
import { repairAccountsInSqlite } from './repair_account_legality.ts';
import { SHOP_ITEMS } from '../../src/data/inventory/items.ts';
import { DATABASE_MIGRATIONS } from '../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../src/logic/db/sqlTranslator.ts';
import { initTestDatabaseSchema } from '../auditors/persistence/_testDbHelper.ts';
import { readAndParseEnv, findServerConfig } from '../lib/supabaseClient.ts';
import { toID } from '../../src/logic/utils/strings.ts';
import type { GameState } from '../../src/types/system/game.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';

enableCompileCache();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VERBOSE_ACCOUNTS_LIMIT = 10;

export interface DiagnosticFinding {
  severity: 'error' | 'warning';
  category: 'valibot' | 'legality' | 'inventory' | 'daycare' | 'pokemon';
  message: string;
  path?: string;
  details?: unknown;
}

export interface LoadedAccountData {
  userId: string;
  username: string;
  email?: string;
  source: string;
  rawSaveData: GameState;
  lastSaveId?: string;
}

interface BackupProfileRow {
  id?: string;
  email?: string;
  username?: string;
}

interface BackupSaveRow {
  user_id?: string;
  save_data?: string | GameState;
  last_save_id?: string;
}

async function loadFromSupabase(serverName: string, userInput: string): Promise<LoadedAccountData | null> {
  const serverConfigs = await readAndParseEnv();
  const conf = findServerConfig(serverConfigs, serverName);

  if (!conf) {
    console.error(styleText('red', `❌ Error: No se encontró la configuración para el servidor "${serverName}" en el archivo .env maestro.`));
    process.exit(1);
  }

  const supabaseUrl = conf.SUPABASE_PUBLIC_URL || conf.API_EXTERNAL_URL || conf.SUPABASE_URL || conf.URL;
  const serviceKey = conf.SERVICE_ROLE_KEY || conf.KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(styleText('red', `❌ Error: Falta URL o SERVICE_ROLE_KEY para el servidor "${serverName}".`));
    process.exit(1);
  }

  console.log(styleText('cyan', `🔌 Conectando a Supabase [${serverName}] en ${supabaseUrl}...`));
  const supabase = createClient(supabaseUrl, serviceKey);

  let profileQuery = supabase.from('profiles').select('id, username, email, trainer_level');
  if (userInput.includes('@')) {
    profileQuery = profileQuery.eq('email', userInput);
  } else if (UUID_PATTERN.test(userInput)) {
    profileQuery = profileQuery.eq('id', userInput);
  } else {
    profileQuery = profileQuery.eq('username', userInput);
  }

  const { data: profiles, error: profileErr } = await profileQuery;
  if (profileErr || !profiles || profiles.length === 0) {
    console.log(styleText('yellow', `⚠️ No se encontró perfil directo con "${userInput}". Buscando en auth.users...`));
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const cleanId = toID(userInput);
    const foundAuth = authUsers?.users.find(u => (u.email && toID(u.email) === cleanId) || u.id === userInput);
    if (!foundAuth) {
      console.error(styleText('red', `❌ Usuario "${userInput}" no encontrado en el servidor ${serverName}.`));
      return null;
    }
    const userId = foundAuth.id;
    const { data: saveRow, error: saveErr } = await supabase.from('game_saves').select('save_data, last_save_id').eq('user_id', userId).single();
    if (saveErr || !saveRow) {
      console.error(styleText('red', `❌ No se encontró partida (game_saves) para el usuario "${userId}" (${foundAuth.email}).`));
      return null;
    }
    const raw = typeof saveRow.save_data === 'string' ? JSON.parse(saveRow.save_data) : saveRow.save_data;
    return {
      userId,
      username: (foundAuth.user_metadata?.username as string) || foundAuth.email || userId,
      email: foundAuth.email,
      source: `Supabase [${serverName}]`,
      rawSaveData: raw,
      lastSaveId: saveRow.last_save_id
    };
  }

  const profile = profiles[0]!;
  const userId = profile.id;
  const { data: saveRow, error: saveErr } = await supabase.from('game_saves').select('save_data, last_save_id').eq('user_id', userId).single();

  if (saveErr || !saveRow) {
    console.error(styleText('red', `❌ No se encontró partida en game_saves para "${profile.username}" (${userId}).`));
    return null;
  }

  const raw = typeof saveRow.save_data === 'string' ? JSON.parse(saveRow.save_data) : saveRow.save_data;
  return {
    userId,
    username: profile.username || userId,
    email: profile.email,
    source: `Supabase [${serverName}]`,
    rawSaveData: raw,
    lastSaveId: saveRow.last_save_id
  };
}

async function loadAllFromSupabase(serverName: string): Promise<LoadedAccountData[]> {
  const serverConfigs = await readAndParseEnv();
  const conf = findServerConfig(serverConfigs, serverName);

  if (!conf) {
    console.error(styleText('red', `❌ Error: No se encontró la configuración para el servidor "${serverName}".`));
    process.exit(1);
  }

  const supabaseUrl = conf.SUPABASE_PUBLIC_URL || conf.API_EXTERNAL_URL || conf.SUPABASE_URL || conf.URL;
  const serviceKey = conf.SERVICE_ROLE_KEY || conf.KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(styleText('red', `❌ Error: Falta URL o SERVICE_ROLE_KEY para el servidor "${serverName}".`));
    process.exit(1);
  }

  console.log(styleText('cyan', `🔌 Conectando a Supabase [${serverName}] en ${supabaseUrl}...`));
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: profiles } = await supabase.from('profiles').select('id, username, email');
  const profileMap = new Map<string, { username?: string; email?: string }>();
  for (const p of (profiles || [])) {
    profileMap.set(p.id, { username: p.username, email: p.email });
  }

  const { data: gameSaves, error } = await supabase.from('game_saves').select('user_id, save_data, last_save_id');
  if (error || !gameSaves) {
    console.error(styleText('red', `❌ Error al consultar game_saves: ${error?.message}`));
    return [];
  }

  const results: LoadedAccountData[] = [];
  for (const s of gameSaves) {
    const raw = typeof s.save_data === 'string' ? JSON.parse(s.save_data) : s.save_data;
    const prof = profileMap.get(s.user_id);
    results.push({
      userId: s.user_id,
      username: prof?.username || raw?.trainer || s.user_id,
      email: prof?.email,
      source: `Supabase [${serverName}]`,
      rawSaveData: raw,
      lastSaveId: s.last_save_id
    });
  }
  return results;
}

function loadFromSqlite(dbPath: string, userInput: string): LoadedAccountData | null {
  const targetDb = path.resolve(process.cwd(), dbPath);
  if (!fs.existsSync(targetDb)) {
    console.error(styleText('red', `❌ Archivo SQLite local no encontrado: ${targetDb}`));
    return null;
  }

  console.log(styleText('cyan', `📂 Abriendo base de datos SQLite: ${targetDb}...`));
  using db = new DatabaseSync(targetDb);

  const profileRow = db.prepare('SELECT id, username, email FROM profiles WHERE id = ? OR username = ? OR email = ?').get(userInput, userInput, userInput) as { id: string; username: string; email?: string } | undefined;
  const targetUserId = profileRow?.id || userInput;

  const saveRow = db.prepare('SELECT user_id, save_data, last_save_id FROM game_saves WHERE user_id = ?').get(targetUserId) as { user_id: string; save_data: string; last_save_id?: string } | undefined;

  if (!saveRow) {
    console.error(styleText('red', `❌ No se encontró partida en game_saves para "${userInput}" en ${targetDb}.`));
    return null;
  }

  const raw = typeof saveRow.save_data === 'string' ? JSON.parse(saveRow.save_data) : saveRow.save_data;
  return {
    userId: targetUserId,
    username: profileRow?.username || raw.trainer || targetUserId,
    email: profileRow?.email,
    source: `SQLite (${path.basename(targetDb)})`,
    rawSaveData: raw,
    lastSaveId: saveRow.last_save_id
  };
}

function loadAllFromSqlite(dbPath: string): LoadedAccountData[] {
  const targetDb = path.resolve(process.cwd(), dbPath);
  if (!fs.existsSync(targetDb)) {
    console.error(styleText('red', `❌ Archivo SQLite local no encontrado: ${targetDb}`));
    return [];
  }

  console.log(styleText('cyan', `📂 Abriendo base de datos SQLite: ${targetDb}...`));
  using db = new DatabaseSync(targetDb);

  const profiles = db.prepare('SELECT id, username, email FROM profiles').all() as Array<{ id: string; username?: string; email?: string }>;
  const profileMap = new Map<string, { username?: string; email?: string }>();
  for (const p of profiles) {
    profileMap.set(p.id, { username: p.username, email: p.email });
  }

  const saves = db.prepare('SELECT user_id, save_data, last_save_id FROM game_saves').all() as Array<{ user_id: string; save_data: string; last_save_id?: string }>;
  const results: LoadedAccountData[] = [];
  for (const s of saves) {
    const raw = typeof s.save_data === 'string' ? JSON.parse(s.save_data) : s.save_data;
    const prof = profileMap.get(s.user_id);
    results.push({
      userId: s.user_id,
      username: prof?.username || raw?.trainer || s.user_id,
      email: prof?.email,
      source: `SQLite (${path.basename(targetDb)})`,
      rawSaveData: raw,
      lastSaveId: s.last_save_id
    });
  }
  return results;
}

function loadFromBackupFile(filePath: string, userInput: string): LoadedAccountData | null {
  const targetFile = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(targetFile)) {
    console.error(styleText('red', `❌ Archivo de respaldo JSON no encontrado: ${targetFile}`));
    return null;
  }

  console.log(styleText('cyan', `📄 Leyendo archivo de respaldo JSON: ${targetFile}...`));
  const content = fs.readFileSync(targetFile, 'utf-8');
  const backup = JSON.parse(content);

  const profiles: BackupProfileRow[] = backup.data?.profiles || [];
  const gameSaves: BackupSaveRow[] = backup.data?.game_saves || [];
  const cleanId = toID(userInput);

  const foundProfile = profiles.find((p: BackupProfileRow) => 
    (p.email && toID(p.email) === cleanId) ||
    (p.username && toID(p.username) === cleanId) ||
    p.id === userInput
  );

  let targetUserId = foundProfile?.id || userInput;
  let saveRow = gameSaves.find((s: BackupSaveRow) => s.user_id === targetUserId);

  if (!saveRow) {
    saveRow = gameSaves.find((s: BackupSaveRow) => {
      const raw = typeof s.save_data === 'string' ? JSON.parse(s.save_data) : s.save_data;
      return raw?.trainer && toID(raw.trainer) === cleanId;
    });
    if (saveRow && saveRow.user_id) {
      targetUserId = saveRow.user_id;
    }
  }

  if (!saveRow) {
    console.error(styleText('red', `❌ No se encontró usuario o partida para "${userInput}" en el respaldo.`));
    return null;
  }

  const raw = typeof saveRow.save_data === 'string' ? JSON.parse(saveRow.save_data) : saveRow.save_data;
  return {
    userId: targetUserId,
    username: foundProfile?.username || raw.trainer || targetUserId,
    email: foundProfile?.email,
    source: `JSON Backup (${path.basename(targetFile)})`,
    rawSaveData: raw,
    lastSaveId: saveRow.last_save_id
  };
}

function loadAllFromBackupFile(filePath: string): LoadedAccountData[] {
  const targetFile = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(targetFile)) {
    console.error(styleText('red', `❌ Archivo de respaldo JSON no encontrado: ${targetFile}`));
    return [];
  }

  console.log(styleText('cyan', `📄 Leyendo archivo de respaldo JSON: ${targetFile}...`));
  const content = fs.readFileSync(targetFile, 'utf-8');
  const backup = JSON.parse(content);

  const profiles: BackupProfileRow[] = backup.data?.profiles || [];
  const gameSaves: BackupSaveRow[] = backup.data?.game_saves || [];

  const profileMap = new Map<string, { username?: string; email?: string }>();
  for (const p of profiles) {
    if (p.id) profileMap.set(p.id, { username: p.username, email: p.email });
  }

  const results: LoadedAccountData[] = [];
  for (const s of gameSaves) {
    if (!s.user_id) continue;
    const raw = typeof s.save_data === 'string' ? JSON.parse(s.save_data) : s.save_data;
    const prof = profileMap.get(s.user_id);
    results.push({
      userId: s.user_id,
      username: prof?.username || raw?.trainer || s.user_id,
      email: prof?.email,
      source: `JSON Backup (${path.basename(targetFile)})`,
      rawSaveData: raw,
      lastSaveId: s.last_save_id
    });
  }
  return results;
}

export function runBatteryOfDiagnostics(saveData: GameState): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  // 1. Estructura y Schema Valibot
  const valibotResult = validateSaveData(saveData);
  if (!valibotResult.success) {
    for (const issue of valibotResult.issues) {
      const pathStr = issue.path?.map((p) => (p as { type: string; key: unknown }).type === 'array' ? `[${(p as { key: unknown }).key}]` : (p as { key: unknown }).key).join('.') || 'root';
      findings.push({
        severity: 'error',
        category: 'valibot',
        message: `Schema Valibot en '${pathStr}': ${issue.message}`,
        path: pathStr,
        details: issue.input
      });
    }
  }

  // 2. Inventario contra catálogo SHOP_ITEMS
  const validItemIds: Set<string> = new Set(SHOP_ITEMS.map(i => i.id));
  if (saveData.inventory) {
    for (const [itemId, count] of Object.entries(saveData.inventory)) {
      if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
        findings.push({
          severity: 'error',
          category: 'inventory',
          message: `Cantidad inválida para '${itemId}': ${count}`,
          path: `inventory.${itemId}`
        });
      }
      if (!validItemIds.has(itemId)) {
        findings.push({
          severity: 'warning',
          category: 'inventory',
          message: `Ítem '${itemId}' no registrado en SHOP_ITEMS.`,
          path: `inventory.${itemId}`
        });
      }
    }
  }

  // 3. Pokémon con checkPokemonLegality
  const team = saveData.team || [];
  const box = (saveData.box || []).filter((p): p is Pokemon => p !== null && p !== undefined);
  const allPokemon = [
    ...team.map((p, idx) => ({ poke: p, location: `team[${idx}]` })),
    ...box.map((p, idx) => ({ poke: p, location: `box[${idx}]` }))
  ];

  const seenUids = new Set<string>();

  for (const { poke, location } of allPokemon) {
    if (!poke || typeof poke !== 'object') continue;

    if (!poke.uid) {
      findings.push({
        severity: 'error',
        category: 'pokemon',
        message: `Pokémon sin UID en ${location}.`,
        path: `${location}.uid`
      });
    } else if (seenUids.has(poke.uid)) {
      findings.push({
        severity: 'error',
        category: 'pokemon',
        message: `UID duplicado '${poke.uid}' en ${location}.`,
        path: `${location}.uid`
      });
    } else {
      seenUids.add(poke.uid);
    }

    if (poke.expNeeded === null || poke.expNeeded === undefined || typeof poke.expNeeded !== 'number') {
      findings.push({
        severity: 'error',
        category: 'pokemon',
        message: `expNeeded inválido (${poke.expNeeded}) en ${location} (${poke.name || poke.id} Nivel ${poke.level}).`,
        path: `${location}.expNeeded`
      });
    }

    try {
      const legality = checkPokemonLegality(poke);
      if (!legality.isLegal) {
        for (const issue of legality.issues) {
          findings.push({
            severity: 'warning',
            category: 'legality',
            message: `[${location}] ${poke.name || poke.id}: ${issue}`,
            path: location
          });
        }
      }
    } catch (legalityErr: unknown) {
      findings.push({
        severity: 'error',
        category: 'pokemon',
        message: `[${location}] ${poke.name || poke.id}: Error al verificar especie/datos: ${(legalityErr as Error).message}`,
        path: `${location}.id`
      });
    }
  }

  // 4. Huevos (Eggs)
  if (Array.isArray(saveData.eggs)) {
    for (let eIdx = 0; eIdx < saveData.eggs.length; eIdx++) {
      const egg = saveData.eggs[eIdx];
      if (egg && typeof egg.id !== 'string') {
        findings.push({
          severity: 'error',
          category: 'daycare',
          message: `ID de huevo no es string en eggs[${eIdx}].`,
          path: `eggs[${eIdx}].id`
        });
      }
    }
  }

  return findings;
}

export function testInMemoryMigrations(saveData: GameState, userId: string): {
  success: boolean;
  fixedCount: number;
  remainingFindings: DiagnosticFinding[];
} {
  using db = new DatabaseSync(':memory:');
  initTestDatabaseSchema(db);

  db.prepare(`
    INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, JSON.stringify(saveData), 'diag-test', new Date().toISOString());

  // Ejecutar todas las migraciones oficiales
  for (const migration of DATABASE_MIGRATIONS) {
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    const isSqliteSpec = migration.sqlite_sql !== undefined;
    if (isSqliteSpec) {
      try {
        db.exec(sqlSource);
      } catch {
        const statements = splitSQLStatements(sqlSource);
        for (const stmt of statements) {
          if (stmt.trim()) {
            try {
              db.exec(stmt);
            } catch {
              // Ignorar errores benignos de esquema
            }
          }
        }
      }
    } else {
      const statements = splitSQLStatements(sqlSource);
      for (const stmt of statements) {
        if (stmt.trim()) {
          const sql = translatePostgresToSqlite(stmt);
          if (sql) {
            try {
              db.exec(sql);
            } catch {
              // Ignorar errores benignos de esquema
            }
          }
        }
      }
    }
  }

  // Legalizar cuentas
  repairAccountsInSqlite({ dbInstance: db, all: true, silent: true });

  const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get(userId) as { save_data: string } | undefined;
  if (!row) {
    return { success: false, fixedCount: 0, remainingFindings: [] };
  }

  const postMigrationSave = JSON.parse(row.save_data) as GameState;
  const remainingFindings = runBatteryOfDiagnostics(postMigrationSave);
  const initialFindings = runBatteryOfDiagnostics(saveData);

  const errorBefore = initialFindings.filter(f => f.severity === 'error').length;
  const errorAfter = remainingFindings.filter(f => f.severity === 'error').length;
  const fixedCount = Math.max(0, errorBefore - errorAfter);

  return {
    success: errorAfter === 0,
    fixedCount,
    remainingFindings
  };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const normalized = rawArgs.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : (['help', 'fix', 'all'].includes(a) ? `--${a}` : a));

  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      user: { type: 'string', short: 'u' },
      server: { type: 'string', short: 's' },
      file: { type: 'string', short: 'f' },
      db: { type: 'string', short: 'd', default: 'poke_local.db' },
      all: { type: 'boolean', short: 'a' },
      'save-json': { type: 'string' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true,
    strict: false
  });

  const isHelp = values.help || rawArgs.includes('help') || rawArgs.includes('--help') || rawArgs.includes('-h');
  if (isHelp) {
    console.log(`
🔍 POKÉ VICIO — DIAGNÓSTICO INTEGRAL DE CUENTAS

Uso:
  # Diagnosticar TODAS las cuentas de un servidor:
  npm run db:diagnose-account server=<perfil> all
  npm run db:diagnose-account server=server_franco all

  # Diagnosticar TODAS las cuentas de un respaldo JSON:
  npm run db:diagnose-account file=<ruta_json> all

  # Diagnosticar una cuenta específica:
  npm run db:diagnose-account server=server_franco user=kenviota@gmail.com
  npm run db:diagnose-account file=<ruta_json> user=Angianemar
  npm run db:diagnose-account user=local_ash

Opciones:
  all                      Audita todas las cuentas disponibles en el origen seleccionado.
  server=<perfil>          Nombre del perfil de servidor en .env (ej: server_franco, nas_franco, cloud).
  user=<id|email|user>     Identificador, correo o nombre de usuario del entrenador a diagnosticar.
  file=<ruta>              Ruta directa a un archivo JSON de respaldo.
  db=<ruta>                Ruta al archivo SQLite local (por defecto: poke_local.db).
  save-json=<ruta>         Exporta los datos de guardado crudos descargados a un archivo JSON local.
  help                     Muestra este mensaje de ayuda.
`);
    process.exit(0);
  }

  const isAll = Boolean(values.all || rawArgs.includes('all') || values.user === 'all');
  const userInput = (typeof values.user === 'string' && values.user !== 'all' ? values.user : undefined) || positionals.find(p => !p.startsWith('-') && !p.includes('=') && p !== 'all') || (values.server ? undefined : (positionals[0] !== 'all' ? positionals[0] : undefined));
  const serverInput = (typeof values.server === 'string' ? values.server : undefined) || (rawArgs.some(a => a.startsWith('server=')) ? rawArgs.find(a => a.startsWith('server='))?.split('=')[1] : undefined);
  const fileInput = typeof values.file === 'string' ? values.file : undefined;
  const dbInput = typeof values.db === 'string' ? values.db : 'poke_local.db';

  if (!isAll && !userInput) {
    console.error(styleText('yellow', '⚠️ Debes especificar el usuario a diagnosticar con user=<id|email|username> o pasar "all" para diagnosticar todas las cuentas.'));
    console.log(styleText('gray', 'Ejemplo: npm run db:diagnose-account server=server_franco all'));
    process.exit(1);
  }

  console.log(styleText('bold', '\n======================================================'));
  console.log(styleText('bold', '🧪 POKÉ VICIO — DIAGNÓSTICO DE CUENTAS & PARTIDAS'));
  console.log(styleText('bold', '======================================================'));

  let accounts: LoadedAccountData[] = [];

  if (isAll) {
    if (fileInput) {
      accounts = loadAllFromBackupFile(fileInput);
    } else if (serverInput && serverInput !== 'local') {
      accounts = await loadAllFromSupabase(serverInput);
    } else {
      accounts = loadAllFromSqlite(dbInput);
    }
  } else {
    let singleAcc: LoadedAccountData | null = null;
    if (fileInput) {
      singleAcc = loadFromBackupFile(fileInput, userInput!);
    } else if (serverInput && serverInput !== 'local') {
      singleAcc = await loadFromSupabase(serverInput, userInput!);
    } else {
      singleAcc = loadFromSqlite(dbInput, userInput!);
    }
    if (singleAcc) accounts = [singleAcc];
  }

  if (accounts.length === 0) {
    console.error(styleText('red', '\n❌ No se encontraron partidas para auditar.'));
    process.exit(1);
  }

  console.log(styleText('cyan', `\n📊 Total de cuentas a diagnosticar: ${accounts.length}\n`));

  const allSummary: Array<{
    userId: string;
    username: string;
    email?: string;
    level: number;
    pokemonCount: number;
    errorCount: number;
    warningCount: number;
    fixedByMigration: boolean;
    errors: DiagnosticFinding[];
    warnings: DiagnosticFinding[];
  }> = [];

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFixed = 0;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i]!;
    const save = acc.rawSaveData;
    const pokes = (save.team?.length || 0) + (save.box?.filter(Boolean).length || 0);

    const findings = runBatteryOfDiagnostics(save);
    const errors = findings.filter(f => f.severity === 'error');
    const warnings = findings.filter(f => f.severity === 'warning');

    const migSim = testInMemoryMigrations(save, acc.userId);

    totalErrors += errors.length;
    totalWarnings += warnings.length;
    if (migSim.success && errors.length > 0) totalFixed++;

    allSummary.push({
      userId: acc.userId,
      username: acc.username,
      email: acc.email,
      level: save.trainerLevel ?? 1,
      pokemonCount: pokes,
      errorCount: errors.length,
      warningCount: warnings.length,
      fixedByMigration: migSim.success,
      errors,
      warnings
    });

    const statusBadge = errors.length === 0 
      ? styleText('green', '✔ SANA')
      : (migSim.success ? styleText('yellow', `⚠️ ${errors.length} ERR (100% Corregible)`) : styleText('red', `❌ ${errors.length} ERR (Requiere Revisión)`));

    console.log(`[${i + 1}/${accounts.length}] ${styleText('bold', acc.username)} (${styleText('dim', acc.email || acc.userId)}) — Nv.${save.trainerLevel ?? 1} (${pokes} Pokes) ➔ ${statusBadge}`);
    if (errors.length > 0 && (!isAll || accounts.length <= MAX_VERBOSE_ACCOUNTS_LIMIT)) {
      for (const err of errors) {
        console.log(`     ↳ [${styleText('red', err.category)}] ${err.message}`);
      }
    }
  }

  console.log('\n======================================================');
  console.log(styleText('bold', '📋 RESUMEN GLOBAL DE AUDITORÍA'));
  console.log('======================================================');
  console.log(`👤 Cuentas auditadas: ${accounts.length}`);
  console.log(`🔴 Total Errores Críticos: ${totalErrors > 0 ? styleText('red', String(totalErrors)) : styleText('green', '0')}`);
  console.log(`🟡 Total Advertencias de Legalidad: ${totalWarnings > 0 ? styleText('yellow', String(totalWarnings)) : styleText('green', '0')}`);
  console.log(`🟢 Cuentas con errores corregibles por SQL: ${styleText('green', String(totalFixed))}`);

  const faultyAccounts = allSummary.filter(a => a.errorCount > 0);
  const unfixableAccounts = allSummary.filter(a => a.errorCount > 0 && !a.fixedByMigration);

  if (faultyAccounts.length > 0) {
    console.log(styleText('yellow', `\n⚠️  Cuentas con errores críticos (${faultyAccounts.length}):`));
    for (const f of faultyAccounts) {
      console.log(`  • ${styleText('bold', f.username)} (${f.email || f.userId}): ${f.errorCount} errores. ¿Corregido por migración SQL?: ${f.fixedByMigration ? styleText('green', 'SÍ ✅') : styleText('red', 'NO ❌')}`);
    }
  }

  if (unfixableAccounts.length === 0 && faultyAccounts.length > 0) {
    console.log(styleText('green', `\n🎉 ¡EXCELENTE! El 100% de los errores críticos de todas las cuentas se solucionan automáticamente aplicando las migraciones SQL registradas.`));
    if (serverInput) {
      console.log(styleText('cyan', `\n💡 Para aplicar la migración y corregir todas las cuentas en ${serverInput}:`));
      console.log(styleText('bold', `   npm run servers:db:update server=${serverInput}`));
    }
  } else if (unfixableAccounts.length > 0) {
    console.log(styleText('red', `\n❌ Hay ${unfixableAccounts.length} cuenta(s) con errores no cubiertos por las migraciones actuales. Se debe revisar caso por caso.`));
  }

  // Guardar reporte JSON
  const reportDir = path.resolve(process.cwd(), 'scratch/audits');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.resolve(reportDir, 'all_accounts_diagnosis.json');
  fs.writeFileSync(reportPath, JSON.stringify(allSummary, null, 2), 'utf-8');
  console.log(styleText('dim', `\n💾 Reporte detallado guardado en: ${reportPath}\n`));
}

if (process.argv[1]?.includes('diagnose_account')) {
  main().catch((err: unknown) => {
    console.error(styleText('red', `💥 Error fatal en el diagnóstico: ${(err as Error).message}`));
    process.exit(1);
  });
}
