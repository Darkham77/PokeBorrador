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

describe('Real Backup Upgrade Pipeline & Dynamic Table Sanitization Test', () => {
  it('should run upgradeBackup() on the real backup fixture and output a fully sanitized and compliant _upgraded.json backup file', async () => {
    const fixtureRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
    const fixturePath = path.resolve(fixtureRelPath);
    assert.ok(fs.existsSync(fixturePath), `Fixture backup file must exist at ${fixtureRelPath}`);

    // Set process.argv to invoke upgradeBackup on the fixture
    const originalArgv = process.argv;
    process.argv = ['node', 'scripts/database/upgrade_backup.ts', `file=${fixturePath}`];

    let generatedUpgradedPath = '';
    try {
      generatedUpgradedPath = await upgradeBackup();
    } finally {
      process.argv = originalArgv;
    }

    assert.ok(generatedUpgradedPath, 'upgradeBackup must return the path of the generated upgraded file');
    assert.ok(fs.existsSync(generatedUpgradedPath), `Generated upgraded backup file must exist at ${generatedUpgradedPath}`);

    // Read and parse the generated upgraded backup file
    const upgradedContent = fs.readFileSync(generatedUpgradedPath, 'utf8');
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

    const upgradedObj = JSON.parse(upgradedContent) as UpgradedBackupObject;
    assert.ok(upgradedObj.data, 'Upgraded backup must contain data');
    assert.ok(upgradedObj.metadata, 'Upgraded backup must contain metadata');
    assert.ok(upgradedObj.metadata.db_version?.includes('20260830234500'), `db_version must be 20260830234500, got ${upgradedObj.metadata.db_version}`);

    const allDiscoveredTables = Object.keys(upgradedObj.data);
    assert.ok(allDiscoveredTables.length > 20, `Upgraded backup must contain over 20 tables, found: ${allDiscoveredTables.length}`);

    // Dynamic Anti-Corruption Scan across ALL discovered tables and ALL columns
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

    // Specialized checks for events_config
    const eventRows = (upgradedObj.data['events_config'] || []) as Array<{
      id: string;
      name: string;
      icon: string;
      type: GameEvent['type'];
      active: boolean;
      manual: boolean;
      schedule: Record<string, unknown>;
      config: Record<string, unknown>;
      description: string;
    }>;

    assert.ok(eventRows.length >= 12, `events_config must contain at least 12 events, found: ${eventRows.length}`);
    const eventIds = new Set(eventRows.map(e => e.id));

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

    // Engine simulation with upgraded events
    const sundayInstant = Temporal.Instant.from('2026-08-30T16:00:00Z');
    const sundayActive = eventRows.filter(e => isEventActiveNow(e as GameEvent, sundayInstant)).map(e => e.id);
    assert.ok(sundayActive.includes('doble_exp'), "Sunday must have 'doble_exp' active in upgraded backup");
    assert.ok(sundayActive.includes('dia_safari_suerte'), "Sunday must have 'dia_safari_suerte' active in upgraded backup");
    assert.ok(sundayActive.includes('comunidad_mensual'), "Last Sunday must have 'comunidad_mensual' active in upgraded backup");

    const upcoming = getUpcomingEventOccurrences(eventRows as GameEvent[], sundayInstant);
    assert.ok(upcoming.length >= 7, `Upcoming events must return at least 7 entries, got: ${upcoming.length}`);

    // Specialized checks for game_saves
    const saveRows = (upgradedObj.data['game_saves'] || []) as Array<{ user_id: string; save_data: GameState }>;
    assert.ok(saveRows.length > 0, 'game_saves must contain player saves');

    for (const row of saveRows) {
      const saveData = row.save_data;
      assert.ok(saveData, `Save data for user ${row.user_id} must exist`);

      const valResult = validateSaveData(saveData);
      assert.ok(valResult.success, `Save for user ${row.user_id} must pass Valibot schema validation`);

      const allPokes = [...(saveData.team || []), ...(saveData.box || [])].filter(Boolean) as Pokemon[];
      for (const p of allPokes) {
        assert.ok(Dex.species.get(p.id).exists, `Pokemon species '${p.id}' must exist in Showdown Dex`);
        if (p.ability) {
          assert.ok(Dex.abilities.get(p.ability).exists, `Pokemon ability '${p.ability}' must exist in Showdown Dex`);
        }
        if (p.nature) {
          assert.ok(isNatureId(p.nature), `Pokemon nature '${p.nature}' must be a valid English nature`);
        }
        if ((p.level ?? 1) >= 100) {
          assert.strictEqual(p.expNeeded, 0, `Level 100 Pokémon must have expNeeded = 0`);
        }
      }

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
        }
      }
    }

    // Clean up temporary upgraded test artifact if needed
    try {
      if (generatedUpgradedPath.includes('fixtures')) {
        fs.unlinkSync(generatedUpgradedPath);
      }
    } catch {
      // ignore
    }
  }, 120000);
});
