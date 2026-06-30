import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Dex } from '@pkmn/sim';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Backup Full validation and Dex compatibility test', () => {
  it('should successfully run all SQLite migrations on the server_franco backup fixture and validate all saves against the Showdown Dex', () => {
    // 1. Read the backup
    const backupRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
    const backupPath = path.resolve(backupRelPath);
    assert.ok(fs.existsSync(backupPath), `Backup file must exist at ${backupRelPath}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    assert.ok(backupData.data, 'Backup must contain a data object');

    const gameSaves = backupData.data.game_saves || [];
    assert.ok(gameSaves.length > 0, 'Backup must contain game_saves');

    // 2. Set up SQLite DB in memory
    using db = new DatabaseSync(':memory:');
    
    // Create the baseline schema
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

    // Insert raw saves from the backup
    const insertStmt = db.prepare(`
      INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at)
      VALUES ($user_id, $save_data, $last_save_id, $updated_at)
    `);

    for (const saveRow of gameSaves) {
      const saveDataStr = typeof saveRow.save_data === 'string' ? saveRow.save_data : JSON.stringify(saveRow.save_data);
      insertStmt.run({
        $user_id: saveRow.user_id || 'test_user',
        $save_data: saveDataStr,
        $last_save_id: saveRow.last_save_id || null,
        $updated_at: saveRow.updated_at || new Date().toISOString()
      });
    }

    // 3. Load and run ALL sqlite migrations in chronological order
    const migrationFiles = [
      'database/migrations/20260619202000_migrate_saves_to_showdown_ids.sqlite.sql',
      'database/migrations/20260622000000_migrate_saves_to_pure_showdown_ids.sqlite.sql',
      'database/migrations/20260622000100_migrate_save_move_ids.sqlite.sql',
      'database/migrations/20260622000200_fix_accented_spanish_move_ids.sqlite.sql',
      'database/migrations/20260622000300_migrate_save_eggs_and_missions.sqlite.sql',
      'database/migrations/20260627023400_fix_corrupted_n_move_ids.sqlite.sql',
      'database/migrations/20260629230200_migrate_item_ids_in_saves_v3.sqlite.sql',
      'database/migrations/20260630125200_migrate_saves_to_pure_pkms_item_ids.sqlite.sql'
    ];

    for (const file of migrationFiles) {
      const fullPath = path.resolve(file);
      assert.ok(fs.existsSync(fullPath), `Migration file must exist at ${file}`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const statements = splitSQLStatements(sql);
      for (const stmt of statements) {
        if (stmt.trim()) {
          db.exec(stmt);
        }
      }
    }

    // 4. Retrieve all saves after migrations and audit them using @pkmn/sim Dex
    const selectStmt = db.prepare('SELECT user_id, save_data FROM game_saves');
    const rows = selectStmt.all() as { user_id: string; save_data: string }[];
    
    assert.strictEqual(rows.length, gameSaves.length, 'Number of saves after migration must match original backup');

    const errors: string[] = [];

    for (const row of rows) {
      const userId = row.user_id;
      const saveData: GameState = JSON.parse(row.save_data);
      if (!saveData) continue;

      const team = saveData.team || [];
      const box = saveData.box || [];
      const allPokes = [...team, ...box].filter(Boolean);

      for (const poke of allPokes) {
        const tag = `[User: ${userId}] Pokémon: ${poke.name || poke.id} (Lvl ${poke.level})`;

        // Validate species
        if (poke.id) {
          const speciesObj = Dex.species.get(poke.id);
          if (!speciesObj.exists) {
            errors.push(`${tag} - Invalid species: '${poke.id}'`);
          }
        }

        // Validate ability
        if (poke.ability) {
          const abilityObj = Dex.abilities.get(poke.ability);
          if (!abilityObj.exists) {
            errors.push(`${tag} - Invalid ability: '${poke.ability}'`);
          }
        }

        // Validate nature
        if (poke.nature) {
          const validNatures = [
            'active', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 
            'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 
            'calm', 'gentle', 'sassy', 'careful', 'quirky'
          ];
          if (!validNatures.includes(poke.nature)) {
            errors.push(`${tag} - Invalid nature: '${poke.nature}'`);
          }
        }


        // Validate heldItem
        if (poke.heldItem) {
          const itemObj = Dex.items.get(poke.heldItem);
          const itemsDict = JSON.parse(fs.readFileSync(path.resolve('src/data/inventory/items.json'), 'utf8'));
          const isCustomItem = itemsDict.SHOP_ITEMS.some((item: { id: string }) => item.id === poke.heldItem);
          if (!itemObj.exists && !isCustomItem) {
            errors.push(`${tag} - Invalid held item: '${poke.heldItem}'`);
          }
        }
        const moves = poke.moves || [];
        for (const m of moves) {
          if (m && m.id) {
            const moveObj = Dex.moves.get(m.id);
            if (!moveObj.exists) {
              errors.push(`${tag} - Invalid move: ID '${m.id}' (Name: '${m.name}')`);
            }
          }
        }
      }

      // Validate inventory items
      const inventory = saveData.inventory || {};
      const itemsDict = JSON.parse(fs.readFileSync(path.resolve('src/data/inventory/items.json'), 'utf8'));
      const validItemIds = new Set([
        ...itemsDict.SHOP_ITEMS.map((item: { id: string }) => item.id),
      ]);

      for (const itemKey of Object.keys(inventory)) {
        const isTM = itemKey.startsWith('tm') || itemKey.startsWith('hm');
        if (!validItemIds.has(itemKey) && !isTM) {
          errors.push(`[User: ${userId}] Inventory - Invalid item ID: '${itemKey}'`);
        }
      }
    }

    if (errors.length > 0) {
      const scratchDir = path.resolve('scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir);
      }
      fs.writeFileSync(path.join(scratchDir, 'backup_validation_errors.txt'), errors.join('\n'), 'utf8');
      console.warn(`[Full Backup Audit] Found ${errors.length} validation errors. Wrote log to scratch/backup_validation_errors.txt`);
    }

    assert.strictEqual(errors.length, 0, `There must be 0 validation errors across all migrated backup saves. Found: ${errors.length}`);
  });
});
