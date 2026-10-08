import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Dex } from '@pkmn/sim';
import { validateSaveData } from '../../../src/logic/validation/schemas.ts';
import { isNatureId } from '../../../src/data/battle/natures.ts';
import { isEventActiveNow, type Event as GameEvent } from '../../../src/logic/events/eventEngine.ts';
import { getUpcomingEventOccurrences } from '../../../src/logic/events/eventSchedules.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { upgradeBackup } from '../../../scripts/database/upgrade_backup.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';

interface UpgradedBackupObject {
  metadata: {
    profile?: string;
    timestamp?: string;
    totalTables?: number;
    totalRows?: number;
    db_version?: string;
  };
  data: Record<string, Record<string, unknown>[]>;
  auth?: unknown;
}

function verifyPhysicalMigrationsRegistered(): void {
  const migrationsDir = path.resolve('database/migrations');
  const physicalSqlFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'));

  for (const physicalFile of physicalSqlFiles) {
    const migrationId = physicalFile.replace(/\.sql$/, '');
    const registered = DATABASE_MIGRATIONS.some(m => m.id === migrationId);
    assert.ok(registered, `La migración física '${physicalFile}' no está registrada en src/logic/db/migrations_data.ts. Ejecuta 'npm run database:generate-migrations'.`);
  }
}

async function executeUpgradeBackup(fixturePath: string): Promise<string> {
  const originalArgv = process.argv;
  process.argv = ['node', 'scripts/database/upgrade_backup.ts', `file=${fixturePath}`];
  try {
    return await upgradeBackup();
  } finally {
    process.argv = originalArgv;
  }
}

function parseAndValidateMetadata(generatedUpgradedPath: string): UpgradedBackupObject {
  const upgradedContent = fs.readFileSync(generatedUpgradedPath, 'utf8');
  const upgradedObj = JSON.parse(upgradedContent) as UpgradedBackupObject;
  assert.ok(upgradedObj.data, 'Upgraded backup must contain data');
  assert.ok(upgradedObj.metadata, 'Upgraded backup must contain metadata');
  const latestMigration = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]!;
  const latestVersion = latestMigration.id;
  assert.ok(upgradedObj.metadata.db_version?.includes(latestVersion), `db_version must contain ${latestVersion}, got ${upgradedObj.metadata.db_version}`);
  return upgradedObj;
}

function assertNoCorruptedObjectStrings(upgradedObj: UpgradedBackupObject): void {
  const allDiscoveredTables = Object.keys(upgradedObj.data);
  assert.ok(allDiscoveredTables.length > 20, `Upgraded backup must contain over 20 tables, found: ${allDiscoveredTables.length}`);

  for (const tableName of allDiscoveredTables) {
    const rows = upgradedObj.data[tableName] || [];
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row) continue;
      for (const [colName, val] of Object.entries(row)) {
        if (typeof val === 'string') {
          assert.ok(!val.includes('[object Object]'), `Table '${tableName}', Row ${rIdx}, Col '${colName}' must not contain '[object Object]'`);
          assert.ok(!val.includes('[object Array]'), `Table '${tableName}', Row ${rIdx}, Col '${colName}' must not contain '[object Array]'`);
        }
      }
    }
  }
}

function assertEventsConfigValid(eventRows: Array<Record<string, unknown>>): void {
  assert.ok(eventRows.length >= 12, `events_config must contain at least 12 events, found: ${eventRows.length}`);
  const eventIds = new Set(eventRows.map(e => e.id as string));

  const expectedEvents = [
    'fiebre_oro', 'dia_pesca', 'torneo_pesca', 'dia_crianza',
    'dia_naturaleza', 'torneo_caza', 'fiebre_minera', 'doble_exp',
    'gran_concurso_sabado', 'dia_safari_suerte', 'comunidad_mensual', 'guerra_facciones_mensual'
  ];

  for (const evId of expectedEvents) {
    assert.ok(eventIds.has(evId), `Canonical event '${evId}' must exist in upgraded backup`);
    const ev = eventRows.find(e => e.id === evId);
    assert.ok(ev, `Event ${evId} must be defined`);
    assert.strictEqual(typeof ev.active, 'boolean', `Event ${evId} active must be boolean`);
    assert.strictEqual(typeof ev.schedule, 'object', `Event ${evId} schedule must be object`);
    assert.strictEqual(typeof ev.config, 'object', `Event ${evId} config must be object`);
    assert.ok(ev.schedule !== null && !Array.isArray(ev.schedule), `Event ${evId} schedule must be a valid non-null object`);
    assert.ok(ev.config !== null && !Array.isArray(ev.config), `Event ${evId} config must be a valid non-null object`);
  }

  const sundayInstant = Temporal.Instant.from('2026-08-30T16:00:00Z');
  const sundayActive = eventRows.filter(e => isEventActiveNow(e as unknown as GameEvent, sundayInstant)).map(e => e.id);
  assert.ok(sundayActive.includes('doble_exp'), "Sunday must have 'doble_exp' active in upgraded backup");
  assert.ok(sundayActive.includes('dia_safari_suerte'), "Sunday must have 'dia_safari_suerte' active in upgraded backup");
  assert.ok(sundayActive.includes('comunidad_mensual'), "Last Sunday must have 'comunidad_mensual' active in upgraded backup");

  const upcoming = getUpcomingEventOccurrences(eventRows as unknown as GameEvent[], sundayInstant);
  assert.ok(upcoming.length >= 7, `Upcoming events must return at least 7 entries, got: ${upcoming.length}`);
}

function checkItemValidity(key: string, validItemIds: Set<string>): boolean {
  if (key.startsWith('tm') || key.startsWith('hm')) return true;
  if (validItemIds.has(key)) return true;
  if (Dex.items.get(key).exists) return true;
  return false;
}

function assertPokemonValid(p: Pokemon, checkItem: (k: string) => boolean): void {
  assert.ok(Dex.species.get(p.id).exists, `Pokemon species '${p.id}' must exist in Showdown Dex`);
  if (p.ability) {
    assert.ok(Dex.abilities.get(p.ability).exists, `Pokemon ability '${p.ability}' must exist in Showdown Dex`);
  }
  if (p.nature) {
    assert.ok(isNatureId(p.nature), `Pokemon nature '${p.nature}' must be a valid English nature`);
  }
  if (p.heldItem) {
    assert.ok(checkItem(p.heldItem), `Pokemon held item '${p.heldItem}' must exist in items catalog or Showdown Dex`);
  }
  if ((p.level ?? 1) >= 100) {
    assert.strictEqual(p.expNeeded, 0, `Level 100 Pokémon must have expNeeded = 0`);
  }
}

function assertSaveEggsAndInventory(saveData: GameState, checkItem: (k: string) => boolean): void {
  if (Array.isArray(saveData.eggs)) {
    for (const egg of saveData.eggs) {
      if (!egg) continue;
      assert.ok(!egg.id.startsWith('egg_'), `Egg species ID '${egg.id}' must not start with 'egg_'`);
      assert.ok(typeof egg.nature === 'string' && isNatureId(egg.nature), `Egg nature '${egg.nature}' must be a valid English nature`);
      assert.ok(egg.steps >= 0, `Egg steps '${egg.steps}' must be >= 0`);
    }
  }
  if (saveData.inventory) {
    for (const [itemKey, qty] of Object.entries(saveData.inventory)) {
      assert.ok(Number(qty) >= 0, `Inventory item '${itemKey}' must have non-negative quantity: ${qty}`);
      assert.ok(checkItem(itemKey), `Inventory item '${itemKey}' must exist in items catalog or Showdown Dex`);
    }
  }
}

function assertGameSavesValid(saveRows: Array<Record<string, unknown>>, validItemIds: Set<string>): void {
  assert.ok(saveRows.length > 0, 'game_saves must contain player saves');
  const checkItem = (k: string) => checkItemValidity(k, validItemIds);

  for (const row of saveRows) {
    const saveData = row.save_data as GameState;
    assert.ok(saveData, `Save data for user ${row.user_id} must exist`);

    const valResult = validateSaveData(saveData);
    assert.ok(valResult.success, `Save for user ${row.user_id} must pass Valibot schema validation`);

    const allPokes = [...(saveData.team || []), ...(saveData.box || [])].filter(Boolean) as Pokemon[];
    for (const p of allPokes) {
      assertPokemonValid(p, checkItem);
    }
    assertSaveEggsAndInventory(saveData, checkItem);
  }
}

function assertEscrowPokemonValid(poke: Pokemon | null | undefined, tableLabel: string, rowId: unknown): void {
  if (!poke?.id) return;
  assert.ok(poke.id, `${tableLabel} Pokemon must have id defined in ${rowId}`);
  assert.ok(Dex.species.get(poke.id).exists, `${tableLabel} Pokemon species '${poke.id}' must exist in Dex`);
  assert.ok(isNatureId(poke.nature), `${tableLabel} Pokemon nature '${poke.nature}' must be a valid English nature`);
  assert.notStrictEqual(poke.status, null, `${tableLabel} Pokemon status must not be null`);
}

function assertClaimQueueValid(rows?: Record<string, unknown>[]): void {
  if (!rows) return;
  for (const row of rows) {
    const rawAsset = row.asset_data;
    const asset = typeof rawAsset === 'string' ? JSON.parse(rawAsset) : rawAsset;
    if (asset?.type === 'pokemon' && asset.data) {
      assertEscrowPokemonValid(asset.data as Pokemon, 'claim_queue', row.id);
    }
  }
}

function assertMarketListingsValid(rows?: Record<string, unknown>[]): void {
  if (!rows) return;
  for (const row of rows) {
    if (row.listing_type === 'pokemon' && row.data) {
      const poke = (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as Pokemon;
      assertEscrowPokemonValid(poke, 'market_listings', row.id);
    }
  }
}

function assertTradeOffersValid(rows?: Record<string, unknown>[]): void {
  if (!rows) return;
  for (const row of rows) {
    for (const k of ['offer_pokemon', 'request_pokemon']) {
      const rawMon = row[k];
      if (!rawMon) continue;
      const poke = (typeof rawMon === 'string' ? JSON.parse(rawMon) : rawMon) as Pokemon;
      assertEscrowPokemonValid(poke, `trade_offers ${k}`, row.id);
    }
  }
}

function assertEscrowAuditValid(data: Record<string, Record<string, unknown>[]>): void {
  assertClaimQueueValid(data.claim_queue);
  assertMarketListingsValid(data.market_listings);
  assertTradeOffersValid(data.trade_offers);
}

describe('Real Backup Upgrade Pipeline & Dynamic Table Sanitization Test', () => {
  it('should run upgradeBackup() on the real backup fixture and output a fully sanitized and compliant _upgraded.json backup file', async () => {
    const fixtureRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
    const fixturePath = path.resolve(fixtureRelPath);
    assert.ok(fs.existsSync(fixturePath), `Fixture backup file must exist at ${fixtureRelPath}`);

    verifyPhysicalMigrationsRegistered();
    const generatedUpgradedPath = await executeUpgradeBackup(fixturePath);

    assert.ok(generatedUpgradedPath, 'upgradeBackup must return the path of the generated upgraded file');
    assert.ok(fs.existsSync(generatedUpgradedPath), `Generated upgraded backup file must exist at ${generatedUpgradedPath}`);

    const upgradedObj = parseAndValidateMetadata(generatedUpgradedPath);
    assertNoCorruptedObjectStrings(upgradedObj);

    assertEventsConfigValid(upgradedObj.data['events_config'] || []);

    const itemsDict = JSON.parse(fs.readFileSync(path.resolve('src/data/inventory/items.json'), 'utf8')) as { SHOP_ITEMS: Array<{ id: string }> };
    const validItemIds = new Set(itemsDict.SHOP_ITEMS.map((item) => item.id));

    assertGameSavesValid(upgradedObj.data['game_saves'] || [], validItemIds);
    assertEscrowAuditValid(upgradedObj.data);

    try {
      if (generatedUpgradedPath.includes('fixtures')) {
        fs.unlinkSync(generatedUpgradedPath);
      }
    } catch {
      // ignore
    }
  }, 300000);
});
