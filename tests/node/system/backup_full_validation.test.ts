import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Dex } from '@pkmn/sim';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import { validateSaveData } from '../../../src/logic/validation/schemas.ts';
import { isNatureId } from '../../../src/data/battle/natures.ts';
import { isEventActiveNow, type Event as GameEvent } from '../../../src/logic/events/eventEngine.ts';
import { getUpcomingEventOccurrences } from '../../../src/logic/events/eventSchedules.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';

const CANONICAL_EVENT_IDS = [
  'fiebre_oro',
  'dia_pesca',
  'torneo_pesca',
  'dia_crianza',
  'dia_naturaleza',
  'torneo_caza',
  'fiebre_minera',
  'doble_exp',
  'gran_concurso_sabado',
  'dia_safari_suerte',
  'comunidad_mensual',
  'guerra_facciones_mensual'
] as const;

describe('Dynamic Multi-Table Real Backup Validation & Dex Compatibility Test', () => {
  it('should dynamically load 100% of tables from the real backup fixture, execute migrations, sanitize data, and audit all discovered tables', async () => {
    // 1. Read the real backup fixture
    const backupRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
    const backupPath = path.resolve(backupRelPath);
    assert.ok(fs.existsSync(backupPath), `Backup file must exist at ${backupRelPath}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    interface RawBackupObject {
      metadata?: Record<string, unknown>;
      data?: Record<string, Record<string, unknown>[]>;
      auth?: unknown;
    }
    const backupObj = JSON.parse(backupContent) as RawBackupObject;
    assert.ok(backupObj.data, 'Backup must contain a data object');

    const backupData = backupObj.data;
    const backupTableNames = Object.keys(backupData);
    assert.ok(backupTableNames.length > 20, `Real backup must have over 20 tables, found: ${backupTableNames.length}`);

    // 2. Set up SQLite in-memory DB and dynamically load ALL tables from the backup
    using db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = OFF;');

    for (const [tableName, rows] of Object.entries(backupData)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const sample = rows[0];
      if (!sample || typeof sample !== 'object') continue;
      const cols = Object.keys(sample);

      let pkClause = '';
      if (tableName === 'system_config' || tableName === 'config') {
        pkClause = ', PRIMARY KEY ("key")';
      } else if (['game_saves', 'passive_teams', 'war_factions', 'war_coins', 'daycare_upgrades', 'ranked_queue'].includes(tableName)) {
        pkClause = ', PRIMARY KEY ("user_id")';
      } else if (tableName === 'guardian_captures') {
        pkClause = ', PRIMARY KEY ("capture_date", "map_id", "user_id")';
      } else if (tableName === 'war_dominance') {
        pkClause = ', PRIMARY KEY ("week_id", "map_id")';
      } else if (cols.includes('id')) {
        pkClause = ', PRIMARY KEY ("id")';
      }

      const colDefs = cols.map(c => `"${c}" TEXT`).join(', ') + pkClause;
      db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs})`);

      const placeholders = cols.map(() => '?').join(', ');
      const colNames = cols.map(c => `"${c}"`).join(', ');
      const stmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (${colNames}) VALUES (${placeholders})`);
      for (const r of rows) {
        const vals = cols.map(c => {
          const v = r[c];
          if (v === null || v === undefined) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v);
        });
        stmt.run(...vals);
      }
    }

    db.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)');

    // 3. Verify that all physical .sql files in database/migrations/ are present in DATABASE_MIGRATIONS
    const MIGRATIONS_DIR = path.resolve('database/migrations');
    const physicalSqlFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'));

    for (const physicalFile of physicalSqlFiles) {
      const migrationId = physicalFile.replace(/\.sql$/, '');
      const registered = DATABASE_MIGRATIONS.some(m => m.id === migrationId);
      assert.ok(registered, `La migración física '${physicalFile}' no está registrada en src/logic/db/migrations_data.ts. Ejecuta 'npm run migrations:generate'.`);
    }

    // 4. Identify previously applied migrations and run all pending migrations in order
    const selectApplied = db.prepare('SELECT id FROM _migrations');
    const appliedRows = selectApplied.all() as { id: string }[];
    const appliedSet = new Set(appliedRows.map(r => r.id));

    let appliedCount = 0;
    for (const migration of DATABASE_MIGRATIONS) {
      if (appliedSet.has(migration.id)) continue;

      const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
      const isSqliteSpec = migration.sqlite_sql !== undefined;
      if (isSqliteSpec) {
        try {
          db.exec(sqlSource);
        } catch {
          const statements = splitSQLStatements(sqlSource);
          for (const stmt of statements) {
            if (stmt.trim()) {
              try { db.exec(stmt); } catch { /* ignore */ }
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
              } catch (stmtErr: unknown) {
                const msg = (stmtErr as Error).message.toLowerCase();
                const isDuplicate = msg.includes('duplicate column') || msg.includes('already exists');
                const isMissing = msg.includes('no such column');
                if (!isDuplicate && !isMissing) {
                  throw stmtErr;
                }
              }
            }
          }
        }
      }
      db.prepare('INSERT OR REPLACE INTO _migrations (id, applied_at) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      appliedCount++;
    }

    assert.ok(appliedCount > 0, `At least 1 pending migration must be applied to the old backup (applied: ${appliedCount})`);

    // 5. DYNAMIC TABLE DISCOVERY & GENERAL INTEGRITY AUDIT (Zero [object Object] in any table)
    const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const discoveredTables = (tablesStmt.all() as { name: string }[]).map(t => t.name);
    assert.ok(discoveredTables.length > 20, `Must discover at least 20 tables in SQLite, found: ${discoveredTables.length}`);

    const corruptionErrors: string[] = [];

    for (const tableName of discoveredTables) {
      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, unknown>[];
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (!row) continue;
        for (const [colName, val] of Object.entries(row)) {
          if (typeof val === 'string') {
            if (val.includes('[object Object]')) {
              corruptionErrors.push(`[Table: ${tableName}, Row: ${rIdx}, Col: ${colName}] contains corrupt string '[object Object]'`);
            }
            if (val.includes('[object Array]')) {
              corruptionErrors.push(`[Table: ${tableName}, Row: ${rIdx}, Col: ${colName}] contains corrupt string '[object Array]'`);
            }
          }
        }
      }
    }

    assert.deepStrictEqual(corruptionErrors, [], `Found corruption in database tables:\n${corruptionErrors.join('\n')}`);

    // 7. SPECIALIZED DOMAIN AUDIT: events_config
    assert.ok(discoveredTables.includes('events_config'), "Discovered tables must include 'events_config'");
    const eventRows = db.prepare('SELECT * FROM events_config').all() as Record<string, unknown>[];
    const eventIds = new Set(eventRows.map(e => String(e.id)));

    for (const canonId of CANONICAL_EVENT_IDS) {
      assert.ok(eventIds.has(canonId), `Canonical event '${canonId}' must be present in events_config`);
    }

    // Validate structure of each canonical event
    const parsedEvents: GameEvent[] = [];
    for (const row of eventRows) {
      const evId = String(row.id);
      let schedObj: Record<string, unknown> = {};
      let configObj: Record<string, unknown> = {};

      if (typeof row.schedule === 'string') {
        assert.doesNotThrow(() => { schedObj = JSON.parse(row.schedule as string); }, `Event ${evId} schedule must be valid JSON`);
      } else if (typeof row.schedule === 'object' && row.schedule !== null) {
        schedObj = row.schedule as Record<string, unknown>;
      }

      if (typeof row.config === 'string') {
        assert.doesNotThrow(() => { configObj = JSON.parse(row.config as string); }, `Event ${evId} config must be valid JSON`);
      } else if (typeof row.config === 'object' && row.config !== null) {
        configObj = row.config as Record<string, unknown>;
      }

      const activeBool = row.active === 1 || row.active === '1' || row.active === 'true' || row.active === true;
      const gameEvent: GameEvent = {
        id: evId,
        name: String(row.name || ''),
        description: String(row.description || ''),
        type: row.type as GameEvent['type'],
        icon: String(row.icon || ''),
        active: activeBool,
        schedule: schedObj,
        config: configObj
      };
      parsedEvents.push(gameEvent);
    }

    // Test isEventActiveNow for Sunday (30/08/2026) -> doble_exp, dia_safari_suerte, and comunidad_mensual must be active
    const sundayInstant = Temporal.Instant.from('2026-08-30T15:00:00Z');
    const sundayActive = parsedEvents.filter(e => isEventActiveNow(e, sundayInstant)).map(e => e.id);

    assert.ok(sundayActive.includes('doble_exp'), "Sunday must have 'doble_exp' active");
    assert.ok(sundayActive.includes('dia_safari_suerte'), "Sunday must have 'dia_safari_suerte' active");
    assert.ok(sundayActive.includes('comunidad_mensual'), "Last Sunday of August must have 'comunidad_mensual' active");

    // Test upcoming 7 days
    const upcoming = getUpcomingEventOccurrences(parsedEvents, sundayInstant);
    assert.ok(upcoming.length >= 7, `Upcoming 7 days must have at least 7 event occurrences, found: ${upcoming.length}`);

    // 8. SPECIALIZED DOMAIN AUDIT: game_saves
    const finalSaveRows = db.prepare('SELECT user_id, save_data FROM game_saves').all() as { user_id: string; save_data: string }[];
    const saveErrors: string[] = [];

    for (const row of finalSaveRows) {
      const userId = row.user_id;
      const saveData: GameState = JSON.parse(row.save_data);
      if (!saveData) continue;

      // Valibot validation
      const valResult = validateSaveData(saveData);
      if (!valResult.success) {
        for (const issue of valResult.issues) {
          saveErrors.push(`[User: ${userId}] Valibot Error: ${issue.message}`);
        }
      }

      // Showdown Dex legality
      const allPokes = [...(saveData.team || []), ...(saveData.box || [])].filter(Boolean) as Pokemon[];
      for (const p of allPokes) {
        const tag = `[User: ${userId}] Pokémon: ${p.name || p.id} (${p.uid})`;
        if (p.id) {
          const spec = Dex.species.get(p.id);
          if (!spec.exists) saveErrors.push(`${tag} - Invalid species '${p.id}'`);
        }
        if (p.ability) {
          const ab = Dex.abilities.get(p.ability);
          if (!ab.exists) saveErrors.push(`${tag} - Invalid ability '${p.ability}'`);
        }
        if (p.nature) {
          if (!isNatureId(p.nature)) saveErrors.push(`${tag} - Invalid nature '${p.nature}'`);
        }
        if ((p.level ?? 1) >= 100 && p.expNeeded !== 0) {
          saveErrors.push(`${tag} - Level 100 must have expNeeded = 0, got ${p.expNeeded}`);
        }
      }

      // Egg validation
      if (Array.isArray(saveData.eggs)) {
        for (const egg of saveData.eggs) {
          if (!egg) continue;
          if (egg.id && egg.id.startsWith('egg_')) {
            saveErrors.push(`[User: ${userId}] Egg species ID must not start with 'egg_': got '${egg.id}'`);
          }
          if (egg.nature && !isNatureId(egg.nature)) {
            saveErrors.push(`[User: ${userId}] Egg nature must be valid English nature: got '${egg.nature}'`);
          }
        }
      }

      // Inventory validation
      if (saveData.inventory && typeof saveData.inventory === 'object') {
        for (const [itemKey, qty] of Object.entries(saveData.inventory)) {
          if (typeof qty === 'number' && qty < 0) {
            saveErrors.push(`[User: ${userId}] Negative inventory item '${itemKey}': ${qty}`);
          }
        }
      }
    }

    assert.deepStrictEqual(saveErrors, [], `Save data errors found:\n${saveErrors.join('\n')}`);

    // 9. SPECIALIZED DOMAIN AUDIT: profiles & system_config
    const profileRows = db.prepare('SELECT id, username, email, trainer_level FROM profiles').all() as Record<string, unknown>[];
    assert.ok(profileRows.length > 0, 'Profiles must not be empty');

    const configRows = db.prepare('SELECT key, value FROM system_config').all() as { key: string; value: string }[];
    const dbVerRow = configRows.find(c => c.key === 'db_version');
    assert.ok(dbVerRow, "system_config must contain 'db_version'");
    assert.ok(dbVerRow.value.includes('20260830233000'), `db_version must be 20260830233000, got: ${dbVerRow.value}`);
  }, 120000);
});
