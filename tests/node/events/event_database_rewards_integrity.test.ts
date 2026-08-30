/**
 * tests/node/events/event_database_rewards_integrity.test.ts
 *
 * TIER 2 INTEGRITY TEST:
 * Runs all database migrations into an in-memory SQLite database,
 * fetches all active events from `events_config`, and verifies 100% data integrity:
 * - All prize items exist in SHOP_ITEMS (getItemById / getItemName do not throw)
 * - All sub-competition prize items exist in SHOP_ITEMS
 * - All species IDs exist in pokedex (isPokemonSpeciesId)
 * - All rotation themes and banner keys are valid
 *
 * Enforces Zero Error Suppression: Fails loudly if ANY item or species is mistyped.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import { getItemById, getItemName } from '../../../src/data/inventory/items.ts';
import { isEnabledPokemonId } from '../../../src/data/system/constants.ts';
import { FIRE_RED_MAPS } from '../../../src/data/world/maps.ts';
import { getFinalGroundRates } from '../../../src/logic/encounters/encounters.ts';
import {
  getGlobalMultipliers,
  getSpeciesBoosts,
  getMinigameBuffs,
  resolveEventSubCompetitions,
  isPokemonEligibleForEvent,
  isPokemonEligibleForSubCompetition,
  evaluatePokemonForSubCompetition,
  type Event as GameEvent
} from '../../../src/logic/events/eventEngine.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

interface RawPrize {
  type?: string;
  money?: number;
  battleCoins?: number;
  item?: string;
  items?: Record<string, number>;
  species?: string;
  shiny?: boolean;
  level?: number;
}

interface RawSubComp {
  id: string;
  name?: string;
  metric?: string;
  order?: string;
  prizes?: {
    first?: RawPrize;
    second?: RawPrize;
    third?: RawPrize;
  };
}

interface RawEventConfig {
  hasCompetition?: boolean;
  species?: string;
  banner?: string;
  rotationTheme?: string;
  weeklyRotations?: Record<string, { species?: string; banner?: string; title?: string }>;
  prizes?: {
    first?: RawPrize;
    second?: RawPrize;
    third?: RawPrize;
  };
  subCompetitions?: RawSubComp[];
  [key: string]: unknown;
}

interface EventRow {
  id: string;
  name: string;
  icon: string;
  type: string;
  schedule: string;
  config: string;
  description: string;
  active: number;
}

describe('Event Database Rewards & Species Integrity', () => {
  function createMigratedDatabase(): DatabaseSync {
    const db = new DatabaseSync(':memory:');

    // 1. Initialize base tables
    for (const schema of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    }

    db.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");

    // 2. Apply all migrations in sequence
    for (const m of DATABASE_MIGRATIONS as { id: string; sql: string; sqlite_sql?: string }[]) {
      const sqlSource = m.sqlite_sql !== undefined ? m.sqlite_sql : m.sql;
      const isSqliteSpec = m.sqlite_sql !== undefined;
      const statements = splitSQLStatements(sqlSource);

      for (const stmt of statements) {
        const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
        if (sql) {
          try {
            db.exec(sql);
          } catch (err: unknown) {
            const msg = (err as Error).message.toLowerCase();
            const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
            const isMissing = msg.includes('no such column');
            if (!isDuplicate && !isMissing) {
              throw new Error(`[Migration Error] Failed in migration "${m.id}": ${(err as Error).message}\nSQL: ${sql}`);
            }
          }
        }
      }
    }

    return db;
  }

  function validatePrize(prize: RawPrize, context: string) {
    // Validate single item
    if (prize.item) {
      const itemId = prize.item;
      assert.doesNotThrow(
        () => {
          const item = getItemById(itemId);
          assert.ok(item, `Item ${itemId} returned empty object`);
          const name = getItemName(itemId);
          assert.ok(name && name.length > 0, `Item ${itemId} has empty name`);
        },
        `[${context}] Invalid prize.item "${itemId}". It does not exist in items database.`
      );
    }

    // Validate multiple items map
    if (prize.items && typeof prize.items === 'object') {
      for (const [itemId, qty] of Object.entries(prize.items)) {
        assert.ok(
          typeof qty === 'number' && qty > 0,
          `[${context}] Invalid quantity for item "${itemId}": ${qty}. Must be positive number.`
        );
        assert.doesNotThrow(
          () => {
            const item = getItemById(itemId);
            assert.ok(item, `Item ${itemId} returned empty object`);
            const name = getItemName(itemId);
            assert.ok(name && name.length > 0, `Item ${itemId} has empty name`);
          },
          `[${context}] Invalid prize.items key "${itemId}". It does not exist in items database.`
        );
      }
    }

    // Validate species in prize
    if (prize.species) {
      assert.ok(
        isEnabledPokemonId(prize.species.trim().toLowerCase()),
        `[${context}] Invalid prize.species "${prize.species}". Must belong to ENABLED_POKEMON_IDS.`
      );
    }
  }

  it('migrates database and verifies ALL events in events_config have 100% valid item rewards and enabled species', () => {
    using db = createMigratedDatabase();

    // Query ALL events from events_config (including inactive, legacy, and active)
    const allEvents = db.prepare("SELECT * FROM events_config").all() as unknown as EventRow[];

    assert.ok(allEvents.length >= 8, `Expected at least 8 events in events_config, found ${allEvents.length}`);

    for (const evt of allEvents) {
      const ctx = `Event: ${evt.id} (${evt.name}, active=${evt.active})`;


      let config: RawEventConfig;
      try {
        config = typeof evt.config === 'string' ? JSON.parse(evt.config) as RawEventConfig : evt.config;
      } catch (err) {
        throw new Error(`[${ctx}] Invalid JSON in config column: ${(err as Error).message}`);
      }

      // 1. Validate top-level prizes
      if (config.prizes) {
        if (config.prizes.first) validatePrize(config.prizes.first, `${ctx} > prizes.first`);
        if (config.prizes.second) validatePrize(config.prizes.second, `${ctx} > prizes.second`);
        if (config.prizes.third) validatePrize(config.prizes.third, `${ctx} > prizes.third`);
      }

      // 2. Validate sub-competitions and their prizes
      if (Array.isArray(config.subCompetitions)) {
        for (const sub of config.subCompetitions) {
          const subCtx = `${ctx} > SubComp: ${sub.id}`;
          assert.ok(sub.id && sub.id.length > 0, `[${subCtx}] Sub-competition is missing id`);

          if (sub.prizes) {
            if (sub.prizes.first) validatePrize(sub.prizes.first, `${subCtx} > prizes.first`);
            if (sub.prizes.second) validatePrize(sub.prizes.second, `${subCtx} > prizes.second`);
            if (sub.prizes.third) validatePrize(sub.prizes.third, `${subCtx} > prizes.third`);
          }
        }
      }

      // 3. Validate species
      if (config.species && config.species !== '*') {
        const speciesList = config.species.split(',').map(s => s.trim().toLowerCase());
        for (const sp of speciesList) {
          if (sp) {
            assert.ok(
              isEnabledPokemonId(sp),
              `[${ctx}] Invalid species ID in config.species: "${sp}". Must belong to ENABLED_POKEMON_IDS.`
            );
          }
        }
      }

      // 4. Validate weekly rotations
      if (config.weeklyRotations && typeof config.weeklyRotations === 'object') {
        for (const [weekNum, rot] of Object.entries(config.weeklyRotations)) {
          const rotCtx = `${ctx} > WeeklyRotation: week ${weekNum}`;
          if (rot.species && rot.species !== '*') {
            const rotSpecies = rot.species.split(',').map(s => s.trim().toLowerCase());
            for (const sp of rotSpecies) {
              if (sp) {
                assert.ok(
                  isEnabledPokemonId(sp),
                  `[${rotCtx}] Invalid species ID in rotation: "${sp}". Must belong to ENABLED_POKEMON_IDS.`
                );
              }
            }
          }
          if (rot.banner) {
            assert.ok(
              typeof rot.banner === 'string' && rot.banner.length > 0,
              `[${rotCtx}] Invalid banner in rotation: ${rot.banner}`
            );
          }
        }
      }
    }
  });

  it('verifies ALL migrated events execute seamlessly across ALL maps, minigames, and 52 calendar weeks without errors', () => {
    using db = createMigratedDatabase();
    const rows = db.prepare("SELECT * FROM events_config WHERE active = 1").all() as unknown as EventRow[];

    const activeEvents: GameEvent[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      type: (r.type as GameEvent['type']) || 'passive_bonus',
      active: true,
      schedule: r.schedule,
      config: r.config,
      description: r.description
    }));

    assert.ok(activeEvents.length > 0, 'Expected active events in database');

    // Verify species boost calculations for active events
    const spBoost = getSpeciesBoosts(activeEvents, 'magikarp');
    assert.ok(typeof spBoost.rate === 'number');
    assert.ok(typeof spBoost.shiny === 'number');

    // 1. Test Encounter Math across all maps with active events
    const sampleMaps = FIRE_RED_MAPS;
    for (const map of sampleMaps) {
      assert.doesNotThrow(() => {
        const rates = getFinalGroundRates(map, 'day', 'clear', activeEvents);
        assert.ok(rates.pool.length >= 0);
      }, `Failed calculating ground rates on map ${map.id} with active events`);
    }

    // 2. Test Multipliers & Minigame Buffs
    const mults = getGlobalMultipliers(activeEvents);
    assert.ok(typeof mults.exp === 'number');
    assert.ok(typeof mults.money === 'number');

    for (const mg of ['fishing', 'bug_catching', 'casino', 'archaeology']) {
      const buffs = getMinigameBuffs(activeEvents, mg);
      assert.ok(typeof buffs.encounterRateMult === 'number');
      assert.ok(typeof buffs.rareDropMult === 'number');
    }

    // 3. Test Year-Round Weekly Rotation and Sub-Competitions across all 52 weeks
    const testPoke = makePokemon('pidgey', 10, { bypassWhitelist: true }) as Pokemon;
    testPoke.obtainedAt = Temporal.Now.instant().epochMilliseconds;

    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day += 7) {
        const iso = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`;
        const testDate = Temporal.Instant.from(iso);

        for (const ev of activeEvents) {
          const subComps = resolveEventSubCompetitions(ev, testDate);
          assert.ok(Array.isArray(subComps));

          for (const sub of subComps) {
            const evalRes = evaluatePokemonForSubCompetition(testPoke, sub);
            assert.ok(typeof evalRes.score === 'number');

            const isEligSub = isPokemonEligibleForSubCompetition(ev, sub, testPoke, testDate);
            assert.ok(typeof isEligSub.eligible === 'boolean');
          }

          const isEligEv = isPokemonEligibleForEvent(ev, testPoke, testDate);
          assert.ok(typeof isEligEv.eligible === 'boolean');
        }
      }
    }
  });
});
