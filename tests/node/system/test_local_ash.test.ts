import { describe, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { validateAndSanitize } from '../../../src/logic/auth/saveService.ts';
import { validatePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';

const DB_PATH = path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db');

function isMigrationAlreadyApplied(db: DatabaseSync, id: string): boolean {
  try {
    const check = db.prepare('SELECT id FROM _migrations WHERE id = ?').get(id);
    return Boolean(check);
  } catch { // catch-ok: _migrations table might not exist yet
    return false;
  }
}

function executeMigrationStatements(db: DatabaseSync, migration: { id: string; sql: string; sqlite_sql?: string }): void {
  const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
  const isSqliteSpec = migration.sqlite_sql !== undefined;
  const statements = splitSQLStatements(sqlSource);

  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
    try {
      db.exec(sql);
    } catch (err) { // catch-ok: log and continue
      console.error(`Error executing statement in migration ${migration.id}:`, sql, (err as Error).message);
    }
  }

  try {
    db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').run(migration.id, Temporal.Now.instant().toString());
  } catch { // catch-ok: ignore duplicate insert error
  }
}

function validatePokemonList(list: unknown[], slotName: string, userId: string, errors: string[]): void {
  list.forEach((p, idx) => {
    if (!p) return;
    try {
      validatePokemon(p as Parameters<typeof validatePokemon>[0]);
    } catch (err) {
      errors.push(`[User: ${userId}] ${slotName} slot ${idx} (${(p as { id?: string }).id}): ${(err as Error).message}`);
    }
  });
}

function validateSingleSave(row: { user_id: string; save_data: string }, errors: string[]): void {
  console.log(`\nValidating migrated save for user: ${row.user_id}`);
  try {
    const saveData = JSON.parse(row.save_data);
    const res = validateAndSanitize(saveData);
    if (!res.valid || !res.data) {
      errors.push(`[User: ${row.user_id}] Save validation failed: ${res.error}`);
      return;
    }

    if (res.data.team) {
      validatePokemonList(res.data.team, 'Team', row.user_id, errors);
    }

    if (res.data.box) {
      validatePokemonList(res.data.box, 'Box', row.user_id, errors);
    }
  } catch (e) {
    errors.push(`[User: ${row.user_id}] JSON Parse error: ${(e as Error).message}`);
  }
}

describe('Local Ash DB Diagnostics', () => {
  it('should run all SQLite migrations on poke_local_ash.db and validate all saves', async () => {
    const tempDbPath = path.join(os.tmpdir(), `test_local_ash_${Temporal.Now.instant().epochMilliseconds}_${Math.random().toString(36).slice(2)}.db`);
    fs.copyFileSync(DB_PATH, tempDbPath);

    try {
      using db = new DatabaseSync(tempDbPath);

      const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');

      console.log('Running database migrations...');
      for (const migration of DATABASE_MIGRATIONS) {
        if (isMigrationAlreadyApplied(db, migration.id)) continue;
        executeMigrationStatements(db, migration);
      }

      const query = db.prepare('SELECT user_id, save_data FROM game_saves');
      const rows = query.all() as Array<{ user_id: string; save_data: string }>;

      console.log(`Found ${rows.length} save files.`);
      const errors: string[] = []; // no-domain: Non-domain utility collection or data structure

      for (const row of rows) {
        validateSingleSave(row, errors);
      }

      console.log('Errors found:', errors);
      assert.strictEqual(errors.length, 0, `There must be 0 validation errors on the local database. Found: ${errors.length}`);
    } finally {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  });
});
