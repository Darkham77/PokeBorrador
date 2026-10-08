import { enableCompileCache } from 'node:module';
enableCompileCache?.();

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import { repairPokemonLegality, checkPokemonLegality } from '../../src/logic/pokemon/pokemonLegality.ts';
import { isEnabledPokemonId } from '../../src/data/system/constants.ts';
import { makePokemon } from '../../src/logic/pokemon/pokemonFactory.ts';
import { buildDatabaseUrl, getValidatedServerConfigs } from '../lib/supabaseClient.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';
import type { SaveDataDto } from '../../src/logic/validation/schemas.ts';

export interface RepairAccountOptions {
  userId?: string | null;
  all?: boolean;
  server?: string | null;
  dbPath?: string;
  dbInstance?: DatabaseSync;
  silent?: boolean;
}

export interface AccountRepairDetail {
  userId: string;
  modified: boolean;
  fixedPokemonCount: number;
  details: string[]; // no-domain: Non-domain utility collection or data structure
}

export interface RepairSummary {
  accountsAudited: number;
  accountsRepaired: number;
  pokemonRepaired: number;
  accountReports: AccountRepairDetail[];
}

const DEFAULT_DB_PATHS = [
  path.resolve(process.cwd(), 'poke_local.db'),
  path.resolve(process.cwd(), 'database/poke_local.db'),
  path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db')
];

export function findDefaultDb(): string | null {
  for (const p of DEFAULT_DB_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Aplica el algoritmo de auditoría, purga de especies no habilitadas y reparación de legalidad sobre un SaveDataDto.
 * Retorna true si se modificó algún Pokémon o huevo, junto con la lista de cambios.
 */
function purgeEggsFromIncubator(saveData: SaveDataDto, isSilent: boolean, details: string[]): boolean {
  if (!Array.isArray(saveData.eggs)) return false;
  const initial = saveData.eggs.length;
  saveData.eggs = saveData.eggs.filter(egg => {
    if (!egg) return false;
    const eggSpecies = egg.id || egg.pokemonId;
    if (!eggSpecies || !isEnabledPokemonId(eggSpecies)) {
      const logMsg = `Huevo no habilitado eliminado de Incubadora: "${eggSpecies || 'desconocido'}" (UID: ${egg.uid || 'N/A'})`;
      details.push(`  ↳ 🗑️ ${logMsg}`);
      if (!isSilent) console.log(`    ↳ 🗑️ ${logMsg}`);
      return false;
    }
    return true;
  });
  return saveData.eggs.length !== initial;
}

interface DaycareWarehouseEntry {
  readonly species?: unknown;
  readonly id?: unknown;
  readonly isEgg?: unknown;
  readonly steps?: unknown;
}

function isDaycareWarehouseItem(item: unknown): item is DaycareWarehouseEntry {
  return typeof item === 'object' && item !== null;
}

function purgeDaycareWarehouse(saveData: SaveDataDto, isSilent: boolean, details: string[]): boolean {
  const warehouse = saveData.daycareWarehouse;
  if (!Array.isArray(warehouse)) return false;
  const initial = warehouse.length;
  saveData.daycareWarehouse = warehouse.filter(item => {
    if (!isDaycareWarehouseItem(item)) return false;
    const rawSpecies = String(item.species || item.id || '');
    const cleanSpecies = rawSpecies.startsWith('egg_') ? rawSpecies.replace(/^egg_\d+_[a-z0-9]+_?/, '') : rawSpecies;
    const targetSpecies = item.species ? String(item.species) : cleanSpecies;

    if (!targetSpecies || !isEnabledPokemonId(targetSpecies)) {
      const label = item.isEgg || item.steps !== undefined || rawSpecies.startsWith('egg_') ? 'Huevo' : 'Pokémon';
      const logMsg = `${label} no habilitado eliminado de Guardería (Warehouse): "${targetSpecies || 'desconocido'}" (ID: ${item.id || 'N/A'})`;
      details.push(`  ↳ 🗑️ ${logMsg}`);
      if (!isSilent) console.log(`    ↳ 🗑️ ${logMsg}`);
      return false;
    }
    return true;
  });
  return saveData.daycareWarehouse.length !== initial;
}

function purgeNonEnabledPokemon(list: unknown[], locationLabel: string, isSilent: boolean, details: string[]): boolean {
  if (!Array.isArray(list)) return false;
  const initial = list.length;
  const filtered = list.filter((p) => {
    if (!p) return false;
    const poke = p as Pokemon;
    if (!poke.id || !isEnabledPokemonId(poke.id)) {
      const logMsg = `Pokémon no habilitado eliminado de ${locationLabel}: "${poke.name}" (UID: ${poke.uid || 'N/A'})`;
      details.push(`  ↳ 🗑️ ${logMsg}`);
      if (!isSilent) console.log(`    ↳ 🗑️ ${logMsg}`);
      return false;
    }
    return true;
  });
  list.length = 0;
  list.push(...filtered);
  return filtered.length !== initial;
}

function applySaveShield(saveData: SaveDataDto, isSilent: boolean, details: string[]): boolean {
  if (!Array.isArray(saveData.team) || saveData.team.length > 0) return false;

  if (Array.isArray(saveData.box) && saveData.box.length > 0) {
    const promoted = saveData.box.shift();
    if (promoted) {
      saveData.team.push(promoted);
      const logMsg = `Save Shield: Pokémon ${promoted.name} promovido de Caja al Equipo para evitar equipo vacío.`;
      details.push(`  ↳ 🛡️ ${logMsg}`);
      if (!isSilent) console.log(`    ↳ 🛡️ ${logMsg}`);
      return true;
    }
  }

  const rescueStarter = makePokemon('bulbasaur', 5, { bypassWhitelist: true });
  if (rescueStarter) {
    (saveData.team as Pokemon[]).push(rescueStarter);
    const logMsg = `Save Shield: Bulbasaur Nv. 5 legal inyectado de rescate porque la cuenta no poseía ningún Pokémon legal.`;
    details.push(`  ↳ 🛡️ ${logMsg}`);
    if (!isSilent) console.log(`    ↳ 🛡️ ${logMsg}`);
    return true;
  }
  return false;
}

function auditAndRepairPokemonList(list: unknown[], locationLabel: string, isSilent: boolean, details: string[]): number {
  if (!Array.isArray(list)) return 0;
  let fixed = 0;
  list.forEach((p, idx) => {
    if (!p) return;
    const poke = p as Pokemon;
    const check = checkPokemonLegality(poke);
    if (!check.isLegal || poke.isIllegal) {
      const report = repairPokemonLegality(poke);
      if (report.repaired) {
        const header = `[${locationLabel} Slot ${idx}] ${poke.name} (UID: ${poke.uid}):`;
        details.push(header);
        if (!isSilent) console.log(`  ${header}`);
        report.changes.forEach(ch => {
          details.push(`  ↳ ${ch}`);
          if (!isSilent) console.log(`    ↳ ✅ ${ch}`);
        });
        fixed++;
      }
    }
  });
  return fixed;
}

function releaseStuckEventFlags(list: unknown[], locationLabel: string, isSilent: boolean, details: string[]): boolean {
  if (!Array.isArray(list)) return false;
  let modified = false;
  list.forEach((p, idx) => {
    if (!p || typeof p !== 'object') return;
    const poke = p as Pokemon;
    if (poke.onEvent) {
      poke.onEvent = false;
      const logMsg = `[${locationLabel} Slot ${idx}] ${poke.name} (UID: ${poke.uid}) liberado de evento concluido/legacy (onEvent = false).`;
      details.push(`  ↳ 🏆 ${logMsg}`);
      if (!isSilent) console.log(`    ↳ 🏆 ${logMsg}`);
      modified = true;
    }
  });
  return modified;
}

export function auditAndRepairSaveData(
  saveData: SaveDataDto,
  isSilent: boolean
): { modified: boolean; fixedPokemonCount: number; details: string[] } {
  const details: string[] = [];
  let modified = false;

  if (purgeEggsFromIncubator(saveData, isSilent, details)) modified = true;
  if (purgeDaycareWarehouse(saveData, isSilent, details)) modified = true;
  if (purgeNonEnabledPokemon(saveData.box, 'Caja', isSilent, details)) modified = true;
  if (purgeNonEnabledPokemon(saveData.team, 'Equipo', isSilent, details)) modified = true;
  if (applySaveShield(saveData, isSilent, details)) modified = true;

  let fixedCount = 0;
  fixedCount += auditAndRepairPokemonList(saveData.team, 'Equipo', isSilent, details);
  fixedCount += auditAndRepairPokemonList(saveData.box, 'Caja', isSilent, details);
  if (Array.isArray(saveData.daycareWarehouse)) {
    fixedCount += auditAndRepairPokemonList(saveData.daycareWarehouse, 'Guardería Depósito', isSilent, details);
  }
  if (fixedCount > 0) modified = true;

  if (releaseStuckEventFlags(saveData.team, 'Equipo', isSilent, details)) modified = true;
  if (releaseStuckEventFlags(saveData.box, 'Caja', isSilent, details)) modified = true;
  if (Array.isArray(saveData.daycareWarehouse)) {
    if (releaseStuckEventFlags(saveData.daycareWarehouse, 'Guardería Depósito', isSilent, details)) modified = true;
  }

  return { modified, fixedPokemonCount: fixedCount, details };
}

function repairSqliteSingleAccount(
  db: DatabaseSync,
  row: { user_id: string; save_data: string },
  isSilent: boolean,
  summary: RepairSummary
): void {
  if (!isSilent) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Evaluando cuenta: ${row.user_id}`);
  }

  let saveData: SaveDataDto;
  try {
    saveData = JSON.parse(row.save_data) as SaveDataDto;
  } catch (e) {
    const errMsg = `Error al parsear JSON del usuario ${row.user_id}: ${(e as Error).message}`;
    if (!isSilent) console.error(`❌ ${errMsg}`);
    summary.accountReports.push({
      userId: row.user_id,
      modified: false,
      fixedPokemonCount: 0,
      details: [errMsg]
    });
    return;
  }

  const { modified, fixedPokemonCount, details } = auditAndRepairSaveData(saveData, isSilent);

  if (modified) {
    const updatedJson = JSON.stringify(saveData);
    db.prepare('UPDATE game_saves SET save_data = ? WHERE user_id = ?').run(updatedJson, row.user_id);
    if (!isSilent) {
      console.log(`✨ Guardado actualizado con éxito en SQLite (${fixedPokemonCount} Pokémon corregidos).`);
    }
    summary.accountsRepaired++;
    summary.pokemonRepaired += fixedPokemonCount;
  } else {
    if (!isSilent) {
      console.log(`  👌 Todos los Pokémon de esta cuenta son 100% legales.`);
    }
  }

  summary.accountReports.push({
    userId: row.user_id,
    modified,
    fixedPokemonCount,
    details
  });
}

interface ClaimQueueRow {
  id: string; // uuid-ok: claim row id
  asset_data: string;
}

interface MarketListingRow {
  id: string; // uuid-ok: market row id
  data: string;
}

function repairSingleClaimQueueItem(
  claimRow: ClaimQueueRow,
  db: DatabaseSync,
  isSilent: boolean,
  summary: RepairSummary
): void {
  if (!claimRow.asset_data) return;
  try {
    const parsed = JSON.parse(claimRow.asset_data) as { type?: string; data?: unknown };
    if (!parsed || parsed.type !== 'pokemon' || !parsed.data || typeof parsed.data !== 'object') {
      return;
    }
    const poke = parsed.data as Pokemon;
    const initialCheck = checkPokemonLegality(poke);
    if (!initialCheck.isLegal || poke.isIllegal || !poke.id || poke.status === null || poke.maxVigor === undefined) {
      const report = repairPokemonLegality(poke);
      if (report.repaired) {
        db.prepare("UPDATE claim_queue SET asset_data = ? WHERE id = ?").run(JSON.stringify(parsed), claimRow.id);
        summary.pokemonRepaired++;
        if (!isSilent) console.log(`  ↳ 📦 Pokémon en claim_queue (ID: ${claimRow.id}) reparado: ${report.changes.join(', ')}`);
      }
    }
  } catch (err) {
    if (!isSilent) console.error('Error parsing claim_queue row:', err);
  }
}

function repairSqliteClaimQueue(db: DatabaseSync, isSilent: boolean, summary: RepairSummary): void {
  try {
    const claimRows = db.prepare("SELECT id, asset_data FROM claim_queue").all() as ClaimQueueRow[];
    if (!isSilent) console.log(`📦 Auditando claim_queue (${claimRows.length} registros)...`);
    for (const claimRow of claimRows) {
      repairSingleClaimQueueItem(claimRow, db, isSilent, summary);
    }
  } catch (err) {
    if (!isSilent) console.error('Error accessing claim_queue table:', err);
  }
}

function repairSingleMarketListingItem(
  mRow: MarketListingRow,
  db: DatabaseSync,
  isSilent: boolean,
  summary: RepairSummary
): void {
  if (!mRow.data) return;
  try {
    const poke = (typeof mRow.data === 'string' ? JSON.parse(mRow.data) : mRow.data) as Pokemon;
    if (!poke || typeof poke !== 'object') return;
    const initialCheck = checkPokemonLegality(poke);
    if (!initialCheck.isLegal || poke.isIllegal || !poke.id || poke.status === null || poke.maxVigor === undefined) {
      const report = repairPokemonLegality(poke);
      if (report.repaired) {
        db.prepare("UPDATE market_listings SET data = ? WHERE id = ?").run(JSON.stringify(poke), mRow.id);
        summary.pokemonRepaired++;
        if (!isSilent) console.log(`  ↳ 🏪 Pokémon en market_listings (ID: ${mRow.id}) reparado: ${report.changes.join(', ')}`);
      }
    }
  } catch { // catch-ok: ignore corrupt market listing json parse error
    // ignore
  }
}

function repairSqliteMarketListings(db: DatabaseSync, isSilent: boolean, summary: RepairSummary): void {
  try {
    const marketRows = db.prepare("SELECT id, data FROM market_listings WHERE listing_type = 'pokemon'").all() as MarketListingRow[];
    for (const mRow of marketRows) {
      repairSingleMarketListingItem(mRow, db, isSilent, summary);
    }
  } catch { // catch-ok: market_listings table might not exist
    // market_listings table might not exist
  }
}

function openSqliteDbForRepair(options: RepairAccountOptions): { db: DatabaseSync; shouldClose: boolean } {
  if (options.dbInstance) {
    return { db: options.dbInstance, shouldClose: false };
  }
  const targetDbPath = options.dbPath || findDefaultDb();
  if (!targetDbPath || !fs.existsSync(targetDbPath)) {
    throw new Error(`No se encontró ninguna base de datos SQLite en "${targetDbPath || 'rutas por defecto'}".`);
  }
  return { db: new DatabaseSync(targetDbPath), shouldClose: true };
}

function fetchSqliteSaveRows(
  db: DatabaseSync,
  targetUserUid: string | null
): Array<{ user_id: string; save_data: string }> {
  let queryStr = 'SELECT user_id, save_data FROM game_saves';
  const params: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (targetUserUid) {
    queryStr += ' WHERE user_id = ?';
    params.push(targetUserUid);
  } else {
    queryStr += ' ORDER BY user_id ASC';
  }
  return db.prepare(queryStr).all(...params) as Array<{ user_id: string; save_data: string }>;
}

/**
 * Repara cuentas almacenadas en una base de datos SQLite (.db).
 */
export function repairAccountsInSqlite(options: RepairAccountOptions): RepairSummary {
  const isAll = Boolean(options.all);
  const targetUserUid = isAll ? null : (options.userId || null);
  const isSilent = Boolean(options.silent);

  const { db, shouldClose } = openSqliteDbForRepair(options);

  if (!isSilent) {
    console.log(`\n📦 Evaluando base de datos SQLite ${options.dbPath ? options.dbPath : ''}...`);
    if (isAll) {
      console.log(`🌐 Modo masivo (--all): Auditando y corrigiendo todas las cuentas registradas...`);
    } else {
      console.log(`🎯 Modo individual: Reparando cuenta "${targetUserUid}"...`);
    }
  }

  const rows = fetchSqliteSaveRows(db, targetUserUid);
  const summary: RepairSummary = {
    accountsAudited: rows.length,
    accountsRepaired: 0,
    pokemonRepaired: 0,
    accountReports: []
  };

  if (rows.length === 0) {
    if (!isSilent) {
      console.log(targetUserId ? `⚠️ No se encontró ninguna partida para el usuario "${targetUserId}".` : '⚠️ La tabla game_saves está vacía.');
    }
    return summary;
  }

  if (!isSilent) {
    console.log(`🔍 Se encontraron ${rows.length} cuenta(s) para auditar y reparar.\n`);
  }

  for (const row of rows) {
    repairSqliteSingleAccount(db, row, isSilent, summary);
  }

  repairSqliteClaimQueue(db, isSilent, summary);
  repairSqliteMarketListings(db, isSilent, summary);

  if (!isSilent) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 Resumen de Reparación (SQLite):`);
    console.log(`   - Cuentas auditadas: ${summary.accountsAudited}`);
    console.log(`   - Cuentas reparadas: ${summary.accountsRepaired}`);
    console.log(`   - Pokémon reparados: ${summary.pokemonRepaired}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  if (shouldClose) {
    db.close();
  }

  return summary;
}

async function fetchTargetSupabaseRows(
  sql: postgres.Sql,
  targetUser: string | null,
  isAll: boolean,
  isSilent: boolean
): Promise<Array<{ user_id: string; save_data: unknown }>> {
  if (isAll || !targetUser) {
    return await sql`SELECT user_id, save_data FROM public.game_saves ORDER BY user_id ASC` as Array<{ user_id: string; save_data: unknown }>;
  }
  let matchedRows = await sql`SELECT user_id, save_data FROM public.game_saves WHERE user_id::text = ${targetUser}` as Array<{ user_id: string; save_data: unknown }>;

  if (matchedRows.length === 0) {
    const profiles = await sql`SELECT id, username, email FROM public.profiles WHERE username ILIKE ${targetUser} OR email ILIKE ${targetUser}` as Array<{ id: string; username: string; email: string }>;
    if (profiles.length === 1 && profiles[0]?.id) {
      const resolvedUuid = profiles[0].id;
      if (!isSilent) console.log(`👤 Usuario encontrado por perfil: ${profiles[0].username} (UUID: ${resolvedUuid})`);
      matchedRows = await sql`SELECT user_id, save_data FROM public.game_saves WHERE user_id::text = ${resolvedUuid}` as Array<{ user_id: string; save_data: unknown }>;
    } else if (profiles.length > 1) {
      throw new Error(`Se encontraron múltiples usuarios coincidentes con "${targetUser}". Usa el UUID explícito.`);
    }
  }

  return matchedRows;
}

async function repairSupabaseSingleAccount(
  sql: postgres.Sql,
  row: { user_id: string; save_data: unknown },
  isSilent: boolean,
  summary: RepairSummary
): Promise<void> {
  if (!isSilent) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Evaluando cuenta: ${row.user_id}`);
  }

  let saveData: SaveDataDto;
  try {
    if (typeof row.save_data === 'string') {
      saveData = JSON.parse(row.save_data) as SaveDataDto;
    } else if (row.save_data && typeof row.save_data === 'object') {
      saveData = row.save_data as SaveDataDto;
    } else {
      throw new Error('Formato de save_data inválido');
    }
  } catch (e) {
    const errMsg = `Error al procesar JSON del usuario ${row.user_id}: ${(e as Error).message}`;
    if (!isSilent) console.error(`❌ ${errMsg}`);
    summary.accountReports.push({
      userId: row.user_id,
      modified: false,
      fixedPokemonCount: 0,
      details: [errMsg]
    });
    return;
  }

  const { modified, fixedPokemonCount, details } = auditAndRepairSaveData(saveData, isSilent);

  if (modified) {
    const updatedJson = JSON.stringify(saveData);
    await sql`UPDATE public.game_saves SET save_data = ${updatedJson}::jsonb, updated_at = NOW() WHERE user_id = ${row.user_id}`;
    if (!isSilent) {
      console.log(`✨ Guardado actualizado con éxito en Supabase (${fixedPokemonCount} Pokémon corregidos).`);
    }
    summary.accountsRepaired++;
    summary.pokemonRepaired += fixedPokemonCount;
  } else {
    if (!isSilent) {
      console.log(`  👌 Todos los Pokémon de esta cuenta son 100% legales.`);
    }
  }

  summary.accountReports.push({
    userId: row.user_id,
    modified,
    fixedPokemonCount,
    details
  });
}

/**
 * Repara cuentas almacenadas en un servidor Supabase / PostgreSQL.
 */
export async function repairAccountsInSupabase(options: RepairAccountOptions): Promise<RepairSummary> {
  const isAll = Boolean(options.all);
  const targetUser = isAll ? null : (options.userId || null);
  const profile = options.server;
  const isSilent = Boolean(options.silent);

  if (!profile) {
    throw new Error('Debes especificar un perfil de servidor (ej: server_franco, cloud).');
  }

  const { serverConfigs } = await getValidatedServerConfigs();
  const { findServerConfig } = await import('../lib/supabaseClient.ts');
  const conf = findServerConfig(serverConfigs, profile);

  if (!conf) {
    throw new Error(`El perfil o ID "${profile}" no existe en el archivo .env.`);
  }

  const dbUrl = buildDatabaseUrl(conf, profile);
  if (!dbUrl) {
    throw new Error(`No se pudo construir la URL de conexión Postgres para el perfil "${profile}".`);
  }

  if (dbUrl.includes('placeholder')) {
    throw new Error(`La contraseña para "${profile}" es un placeholder.`);
  }

  const isSupabaseCloud = dbUrl.includes('.supabase.co');
  if (!isSilent) {
    console.log(`\n🔌 Conectando al servidor Supabase [${profile}]...`);
    if (isAll) {
      console.log(`🌐 Modo masivo (--all): Auditando y corrigiendo todas las cuentas registradas...`);
    } else {
      console.log(`🎯 Modo individual: Reparando cuenta "${targetUser}"...`);
    }
  }

  const sql = postgres(dbUrl, { ssl: isSupabaseCloud ? 'require' : false, max: 1 });

  const summary: RepairSummary = {
    accountsAudited: 0,
    accountsRepaired: 0,
    pokemonRepaired: 0,
    accountReports: []
  };

  try {
    const rows = await fetchTargetSupabaseRows(sql, targetUser, isAll, isSilent);

    summary.accountsAudited = rows.length;

    if (rows.length === 0) {
      if (!isSilent) {
        console.log(targetUser ? `⚠️ No se encontró ninguna partida para el usuario "${targetUser}".` : '⚠️ La tabla game_saves está vacía.');
      }
      return summary;
    }

    if (!isSilent) {
      console.log(`🔍 Se encontraron ${rows.length} cuenta(s) en Supabase para auditar y reparar.\n`);
    }

    for (const row of rows) {
      await repairSupabaseSingleAccount(sql, row, isSilent, summary);
    }

    if (!isSilent) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎉 Resumen de Reparación (Supabase [${profile}]):`);
      console.log(`   - Cuentas auditadas: ${summary.accountsAudited}`);
      console.log(`   - Cuentas reparadas: ${summary.accountsRepaired}`);
      console.log(`   - Pokémon reparados: ${summary.pokemonRepaired}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    return summary;
  } finally {
    await sql.end();
  }
}

/**
 * Función principal unificada de reparación de cuentas para SQLite o Supabase.
 */
export async function repairAccountsInDatabase(options: RepairAccountOptions): Promise<RepairSummary> {
  if (options.server) {
    return await repairAccountsInSupabase(options);
  }
  return repairAccountsInSqlite(options);
}

async function main() {
  const args = process.argv.slice(2);
  const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : (['all', 'fix', 'help'].includes(a) ? `--${a}` : a));
  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      user: { type: 'string', short: 'u' },
      all: { type: 'boolean', short: 'a' },
      'all-accounts': { type: 'boolean' },
      server: { type: 'string', short: 's' },
      db: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
  });

  const isHelp = values.help || args.includes('help') || args.includes('--help') || args.includes('-h');
  if (isHelp) {
    console.log(`
Uso:
  # Base de datos local (SQLite):
  npm run database:repair-account user=<userId>
  npm run database:repair-account all

  # Servidor remoto / Supabase (PostgreSQL):
  npm run database:repair-account server=<perfil> user=<userId>
  npm run database:repair-account server=<perfil> all

Opciones:
  user=<userId>            ID, nombre de usuario o email de la cuenta a reparar.
  all                      Corrige los Pokémon ilegales de TODAS las cuentas registradas, una por una.
  server=<perfil>          Perfil de servidor Supabase (ej: server_franco, cloud).
  db=<path>                Ruta a la base de datos SQLite (.db). Por defecto busca poke_local.db.
  help                     Muestra esta ayuda.

Ejemplos:
  npm run database:repair-account user=Ash
  npm run database:repair-account all
  npm run database:repair-account server=server_franco user=kenviota@gmail.com
  npm run database:repair-account server=server_franco all
`);
    process.exit(0);
  }

  let targetServer = values.server;
  const remainingPositionals = [...positionals];

  if (!targetServer) {
    try {
      const { baseProfiles, allAvailable } = await getValidatedServerConfigs();
      const serverIdx = remainingPositionals.findIndex(p => allAvailable.includes(p) || baseProfiles.includes(p));
      if (serverIdx !== -1) {
        targetServer = remainingPositionals[serverIdx];
        remainingPositionals.splice(serverIdx, 1);
      }
    } catch { // catch-ok: ignored if .env cannot be read in offline mode
      // Ignored if .env cannot be read in offline mode
    }
  }

  const isAll = Boolean(values.all) || Boolean(values['all-accounts']) || remainingPositionals.some(p => p === 'all' || p === '--all');
  const rawUserId = values.user || (remainingPositionals.find(p => p !== 'all' && p !== '--all') ? String(remainingPositionals.find(p => p !== 'all' && p !== '--all')) : null);
  const targetUserId = isAll ? null : rawUserId;

  if (!isAll && !targetUserId) {
    console.error(`❌ Debes especificar un usuario (ej: npm run database:repair-account <userId> o --user <userId>) o utilizar --all (o el argumento 'all') para corregir todas las cuentas registradas.`);
    console.log(`Usa --help para más información.\n`);
    process.exit(1);
  }

  try {
    await repairAccountsInDatabase({
      userId: targetUserId,
      all: isAll,
      server: targetServer,
      dbPath: values.db
    });
  } catch (err) {
    console.error(`❌ Error al reparar cuentas:`, (err as Error).message);
    process.exit(1);
  }
}

// Ejecutar CLI solo si se llama directamente
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error('Error fatal al reparar cuentas:', err);
    process.exit(1);
  });
}

