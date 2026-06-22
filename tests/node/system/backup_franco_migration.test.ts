import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Franco Backup Migration Unit Test', () => {
  it('should successfully run the SQLite migration on the server_franco backup and translate accented moves', () => {
    // 1. Read the backup
    const backupRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
    const backupPath = path.resolve(backupRelPath);
    assert.ok(fs.existsSync(backupPath), `Backup file must exist at ${backupRelPath}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    assert.ok(backupData.data, 'Backup must contain a data object');

    const gameSaves = backupData.data.game_saves || [];
    assert.ok(gameSaves.length > 0, 'Backup must contain game_saves');

    // 2. Set up SQLite DB in memory using native node:sqlite
    using db = new DatabaseSync(':memory:');
    
    // Create the schema
    db.exec(`
      CREATE TABLE game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT,
        last_save_id TEXT,
        updated_at TEXT
      )
    `);
    
    db.exec(`
      CREATE TABLE system_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);

    // Insert saves from the backup
    const insertStmt = db.prepare(`
      INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at)
      VALUES ($user_id, $save_data, $last_save_id, $updated_at)
    `);

    let savesLoadedCount = 0;
    for (const saveRow of gameSaves) {
      const saveDataStr = typeof saveRow.save_data === 'string' ? saveRow.save_data : JSON.stringify(saveRow.save_data);
      
      // Verify that this save data contains Spanish moves before we migrate
      if (saveDataStr.includes('"gruñido"') || saveDataStr.includes('"arañazo"')) {
        savesLoadedCount++;
      }
      
      insertStmt.run({
        $user_id: saveRow.user_id || 'test_user',
        $save_data: saveDataStr,
        $last_save_id: saveRow.last_save_id || null,
        $updated_at: saveRow.updated_at || new Date().toISOString()
      });
    }
    
    console.log(`Loaded ${savesLoadedCount} saves containing Spanish moves (e.g. gruñido/arañazo) into the test database.`);

    // 3. Load and run the SQLite migration
    const migrationRelPath = 'database/migrations/20260622000200_fix_accented_spanish_move_ids.sqlite.sql';
    const migrationPath = path.resolve(migrationRelPath);
    assert.ok(fs.existsSync(migrationPath), `Migration file must exist at ${migrationRelPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const statements = splitSQLStatements(migrationSQL);
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        db.exec(stmt);
      }
    }

    // 4. Verify post-migration state
    const selectStmt = db.prepare('SELECT user_id, save_data FROM game_saves');
    const rows = selectStmt.all() as { user_id: string; save_data: string }[];
    
    assert.ok(rows.length > 0, 'Should have rows in game_saves after migration');
    
    interface TestPokemonMove {
      id?: string;
      name?: string;
    }

    interface TestPokemon {
      id?: string;
      name?: string;
      moves?: Array<TestPokemonMove | null>;
    }

    let verifiedCount = 0;
    for (const row of rows) {
      const data: GameState = JSON.parse(row.save_data);
      
      // Check that team/box moves no longer contain Spanish IDs/names with accents/ñ
      const checkPokeMoves = (p: TestPokemon, listName: string) => {
        if (!p || !p.moves) return;
        p.moves.forEach((m: TestPokemonMove | null) => {
          if (!m) return;
          // Accented or ñ-containing Spanish moves should have been converted
          if (m.id === 'gruñido' || m.id === 'grunido') {
            assert.fail(`Found unconverted legacy ID '${m.id}' in ${listName} for pokemon ${p.name || p.id}`);
          }
          if (m.id === 'arañazo' || m.id === 'aranazo') {
            assert.fail(`Found unconverted legacy ID '${m.id}' in ${listName} for pokemon ${p.name || p.id}`);
          }
          if (m.id === 'maldición' || m.id === 'maldicion') {
            assert.fail(`Found unconverted legacy ID '${m.id}' in ${listName} for pokemon ${p.name || p.id}`);
          }
          if (m.id === 'látigo' || m.id === 'latigo') {
            assert.fail(`Found unconverted legacy ID '${m.id}' in ${listName} for pokemon ${p.name || p.id}`);
          }
          
          // Verify they mapped to correct English equivalents
          if (m.name === 'Gruñido') {
            assert.strictEqual(m.id, 'growl', `Gruñido should have been converted to 'growl' ID, but got '${m.id}'`);
            verifiedCount++;
          }
          if (m.name === 'Arañazo') {
            assert.strictEqual(m.id, 'scratch', `Arañazo should have been converted to 'scratch' ID, but got '${m.id}'`);
            verifiedCount++;
          }
        });
      };
      
      if (data.team) (data.team as unknown as TestPokemon[]).forEach(p => checkPokeMoves(p, 'team'));
      if (data.box) (data.box as unknown as TestPokemon[]).forEach(p => checkPokeMoves(p, 'box'));
    }

    assert.ok(verifiedCount > 0, 'Should have verified and translated at least some legacy Spanish moves in the backup');
    console.log(`Successfully verified ${verifiedCount} translated Spanish moves in migrated backup.`);
  });
});
