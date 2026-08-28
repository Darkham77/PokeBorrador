/**
 * tests/node/events/event_weekly_rotation_lifecycle.test.ts
 *
 * TIER 2 INTEGRITY TEST:
 * Verifies weekly rotation lifecycle for rotating tournament events (torneo_pesca, torneo_caza).
 * Asserts that when the week of the month advances (Week 1 -> 2 -> 3 -> 4):
 * - getWeekOfMonth() deterministically maps days (1-7 => W1, 8-14 => W2, 15-21 => W3, 22+ => W4)
 * - resolveWeeklyRotation() resolves the correct banner, title, and species for each week
 * - All rotating species exist in pokedex (isPokemonSpeciesId)
 * - Zero unhandled rotation numbers or broken configurations
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import {
  getWeekOfMonth,
  resolveWeeklyRotation,
  type EventConfig
} from '../../../src/logic/events/eventEngine.ts';
import { isEnabledPokemonId } from '../../../src/data/system/constants.ts';

describe('Event Weekly Rotation Lifecycle', () => {
  function createMigratedDatabase(): DatabaseSync {
    const db = new DatabaseSync(':memory:');
    for (const schema of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    }
    db.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");

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

  it('determines week of month correctly across calendar boundaries', () => {
    // Week 1 (Days 1 - 7)
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-01T12:00:00[America/Argentina/Buenos_Aires]')), 1);
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-07T23:59:59[America/Argentina/Buenos_Aires]')), 1);

    // Week 2 (Days 8 - 14)
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-08T00:00:00[America/Argentina/Buenos_Aires]')), 2);
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-14T23:59:59[America/Argentina/Buenos_Aires]')), 2);

    // Week 3 (Days 15 - 21)
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-15T00:00:00[America/Argentina/Buenos_Aires]')), 3);
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-21T23:59:59[America/Argentina/Buenos_Aires]')), 3);

    // Week 4 (Days 22 - 31)
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-22T00:00:00[America/Argentina/Buenos_Aires]')), 4);
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-28T18:00:00[America/Argentina/Buenos_Aires]')), 4);
    assert.equal(getWeekOfMonth(Temporal.ZonedDateTime.from('2026-08-31T23:59:59[America/Argentina/Buenos_Aires]')), 4);
  });

  it('rotates Torneo de Pesca (torneo_pesca) correctly across all 4 weeks with valid banners and enabled species', () => {
    using db = createMigratedDatabase();
    const row = db.prepare("SELECT config FROM events_config WHERE id = 'torneo_pesca'").get() as { config: string };
    assert.ok(row, 'Event torneo_pesca must exist in database');

    const cfg = JSON.parse(row.config) as EventConfig;
    assert.equal(cfg.rotationTheme, 'weekly_4');

    const expectedRotations = [
      {
        week: 1,
        date: '2026-08-04T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'hora_magikarp_full',
        title: 'Torneo Magikarp & Gyarados',
        species: ['magikarp', 'gyarados']
      },
      {
        week: 2,
        date: '2026-08-11T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'pesca_exotica_full',
        title: 'Torneo de Pesca Exótica',
        species: ['shellder', 'staryu', 'horsea', 'seadra', 'goldeen']
      },
      {
        week: 3,
        date: '2026-08-18T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'pesca_profunda_full',
        title: 'Torneo de Pesca Profunda',
        species: ['tentacool', 'tentacruel', 'krabby', 'kingler', 'poliwag']
      },
      {
        week: 4,
        date: '2026-08-25T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'pesca_mistica_full',
        title: 'Torneo de Pesca Mística',
        species: ['dratini', 'dragonair', 'lapras']
      }
    ];

    for (const exp of expectedRotations) {
      const zdt = Temporal.ZonedDateTime.from(exp.date);
      const rot = resolveWeeklyRotation(cfg, zdt);
      assert.ok(rot, `Weekly rotation for week ${exp.week} must not be null`);
      assert.equal(rot.banner, exp.banner, `Week ${exp.week} banner mismatch`);
      assert.equal(rot.title, exp.title, `Week ${exp.week} title mismatch`);

      const species = rot.species.split(',').map(s => s.trim().toLowerCase());
      assert.deepEqual(species, exp.species, `Week ${exp.week} species list mismatch`);

      for (const sp of species) {
        assert.ok(isEnabledPokemonId(sp), `Week ${exp.week} species "${sp}" must belong to ENABLED_POKEMON_IDS`);
      }
    }
  });

  it('rotates Torneo de Caza (torneo_caza) correctly across all 4 weeks with valid banners and enabled species', () => {
    using db = createMigratedDatabase();
    const row = db.prepare("SELECT config FROM events_config WHERE id = 'torneo_caza'").get() as { config: string };
    assert.ok(row, 'Event torneo_caza must exist in database');

    const cfg = JSON.parse(row.config) as EventConfig;
    assert.equal(cfg.rotationTheme, 'weekly_4');

    const expectedRotations = [
      {
        week: 1,
        date: '2026-08-06T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'caza_bichos_full',
        title: 'Concurso de Caza de Bichos',
        species: ['scyther', 'pinsir', 'butterfree', 'beedrill', 'venomoth']
      },
      {
        week: 2,
        date: '2026-08-13T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'safari_park_full',
        title: 'Gran Torneo de la Zona Safari',
        species: ['tauros', 'kangaskhan', 'chansey', 'dodrio']
      },
      {
        week: 3,
        date: '2026-08-20T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'arqueologia_fosiles_full',
        title: 'Torneo de Excavación & Fósiles',
        species: ['kabuto', 'omanyte', 'aerodactyl', 'geodude', 'onix', 'rhyhorn']
      },
      {
        week: 4,
        date: '2026-08-27T19:00:00[America/Argentina/Buenos_Aires]',
        banner: 'caza_nocturna_full',
        title: 'Caza Nocturna & Mística',
        species: ['gastly', 'haunter', 'gengar', 'zubat', 'golbat', 'hypno']
      }
    ];

    for (const exp of expectedRotations) {
      const zdt = Temporal.ZonedDateTime.from(exp.date);
      const rot = resolveWeeklyRotation(cfg, zdt);
      assert.ok(rot, `Weekly rotation for week ${exp.week} must not be null`);
      assert.equal(rot.banner, exp.banner, `Week ${exp.week} banner mismatch`);
      assert.equal(rot.title, exp.title, `Week ${exp.week} title mismatch`);

      const species = rot.species.split(',').map(s => s.trim().toLowerCase());
      assert.deepEqual(species, exp.species, `Week ${exp.week} species list mismatch`);

      for (const sp of species) {
        assert.ok(isEnabledPokemonId(sp), `Week ${exp.week} species "${sp}" must belong to ENABLED_POKEMON_IDS`);
      }
    }
  });
});
