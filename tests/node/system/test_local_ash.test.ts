import { describe, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'fs';
import assert from 'node:assert/strict';
import { validateAndSanitize } from '../../../src/logic/auth/saveService.ts';
import { validatePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';

const DB_PATH = path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db');

describe('Local Ash DB Diagnostics', () => {
  it('should run all SQLite migrations on poke_local_ash.db and validate all saves', async () => {
    console.log('Opening database:', DB_PATH);
    const db = new DatabaseSync(DB_PATH);
    
    // 1. Run migrations first
    const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');
    const { translatePostgresToSqlite } = await import('../../../src/logic/db/sqlTranslator.ts');

    console.log('Running database migrations...');
    for (const migration of DATABASE_MIGRATIONS) {
      let alreadyApplied = false;
      try {
        const check = db.prepare('SELECT id FROM _migrations WHERE id = ?').get(migration.id);
        if (check) alreadyApplied = true;
      } catch (_) {
        // Table _migrations might not exist yet
      }

      if (alreadyApplied) continue;

      const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
      const isSqliteSpec = migration.sqlite_sql !== undefined;
      const statements = splitSQLStatements(sqlSource);
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
          try {
            db.exec(sql);
          } catch (err) {
            console.error(`Error executing statement in migration ${migration.id}:`, sql, (err as Error).message);
          }
        }
      }
      
      try {
        db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      } catch (_) {
        // Ignore insert errors
      }
    }
    
    // 2. Validate saves after migration
    const query = db.prepare('SELECT user_id, save_data FROM game_saves');
    const rows = query.all() as Array<{ user_id: string; save_data: string }>;
    
    console.log(`Found ${rows.length} save files.`);
    const errors: string[] = [];
    
    for (const row of rows) {
      console.log(`\nValidating migrated save for user: ${row.user_id}`);
      try {
        const saveData = JSON.parse(row.save_data);
        const res = validateAndSanitize(saveData);
        if (!res.valid) {
          errors.push(`[User: ${row.user_id}] Save validation failed: ${res.error}`);
          continue;
        }
        
        if (res.data.team) {
          res.data.team.forEach((p: any, idx: number) => {
            try {
              validatePokemon(p);
            } catch (err) {
              errors.push(`[User: ${row.user_id}] Team slot ${idx} (${p.id}): ${(err as Error).message}`);
            }
          });
        }
        
        if (res.data.box) {
          res.data.box.forEach((p: any, idx: number) => {
            try {
              validatePokemon(p);
            } catch (err) {
              errors.push(`[User: ${row.user_id}] Box slot ${idx} (${p.id}): ${(err as Error).message}`);
            }
          });
        }
        
      } catch (e) {
        errors.push(`[User: ${row.user_id}] JSON Parse error: ${(e as Error).message}`);
      }
    }

    console.log('Errors found:', errors);
    assert.strictEqual(errors.length, 0, `There must be 0 validation errors on the local database. Found: ${errors.length}`);
  });
});
