import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Dex } from '@pkmn/sim';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import type { GameState } from '../../../src/types/system/game.ts';

import { canLearnMove } from '../../../src/logic/pokemon/pokemonFactory.ts';

describe('Backup Full validation and Dex compatibility test', () => {
  it('should successfully run all SQLite migrations on the server_franco backup fixture and validate all saves against the Showdown Dex', async () => {
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

    db.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT,
        trainer_level INTEGER,
        player_class TEXT,
        faction TEXT,
        nick_style TEXT,
        avatar_style TEXT,
        elo_rating INTEGER,
        current_session_id TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    db.exec(`CREATE TABLE IF NOT EXISTS friendships (id TEXT PRIMARY KEY, requester_id TEXT, addressee_id TEXT, status TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS global_chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, username TEXT, message TEXT, player_class TEXT, trainer_level INTEGER, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS war_factions (user_id TEXT PRIMARY KEY, email TEXT, faction TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS war_points (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id TEXT, map_id TEXT, faction TEXT, points INTEGER, updated_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS war_dominance (week_id TEXT, map_id TEXT, winner_faction TEXT, union_points INTEGER, poder_points INTEGER, resolved_at TEXT, PRIMARY KEY (week_id, map_id))`);
    db.exec(`CREATE TABLE IF NOT EXISTS events_config (id TEXT PRIMARY KEY, name TEXT, icon TEXT, type TEXT, active INTEGER, manual INTEGER, schedule TEXT, config TEXT, description TEXT, last_awarded_at TEXT, updated_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS competition_entries (id TEXT PRIMARY KEY, event_id TEXT, player_id TEXT, player_name TEXT, player_email TEXT, data TEXT, submitted_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS awards (id TEXT PRIMARY KEY, event_id TEXT, winner_id TEXT, winner_name TEXT, winner_email TEXT, prize TEXT, awarded_at TEXT, claimed INTEGER, claimed_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS competition_results (id TEXT PRIMARY KEY, event_id TEXT, winners TEXT, ended_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS market_listings (id TEXT PRIMARY KEY, seller_id TEXT, seller_name TEXT, listing_type TEXT, data TEXT, price INTEGER, status TEXT, buyer_id TEXT, created_at TEXT, updated_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS battle_invites (id TEXT PRIMARY KEY, sender_id TEXT, opponent_id TEXT, status TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS ranked_queue (user_id TEXT PRIMARY KEY, elo INTEGER, status TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS passive_battle_reports (id TEXT PRIMARY KEY, user_id TEXT, opponent_id TEXT, result TEXT, report_data TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS daycare_slots (id TEXT PRIMARY KEY, player_id TEXT, pokemon_id TEXT, slot_index INTEGER, deposited_at TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS daycare_upgrades (player_id TEXT PRIMARY KEY, egg_capacity INTEGER, slot_boost INTEGER, updated_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS pokedex_entries (id TEXT PRIMARY KEY, player_id TEXT, pokemon_id INTEGER, status TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS trade_offers (id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT, offer_pokemon TEXT, offer_items TEXT, offer_money INTEGER, request_pokemon TEXT, request_items TEXT, request_money INTEGER, message TEXT, status TEXT, created_at TEXT, updated_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS eggs (id TEXT PRIMARY KEY, player_id TEXT, egg_id TEXT, steps_remaining INTEGER, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS guardian_captures (capture_date TEXT, map_id TEXT, user_id TEXT, winner_faction TEXT, pts_awarded INTEGER, captured_at TEXT, PRIMARY KEY (capture_date, map_id, user_id))`);
    db.exec(`CREATE TABLE IF NOT EXISTS war_defenders (id TEXT PRIMARY KEY, user_id TEXT, map_id TEXT, pokemon_uid TEXT, pokemon_data TEXT, wins_count INTEGER, week_id TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, senderId TEXT, senderName TEXT, message TEXT, type TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS claim_queue (id TEXT PRIMARY KEY, user_id TEXT, source_type TEXT, source_id TEXT, asset_data TEXT, created_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)`);

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

    // 3. Load and run ALL registered migrations in chronological order from migrations_data.ts
    const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');
    const { translatePostgresToSqlite } = await import('../../../src/logic/db/sqlTranslator.ts');

    // Assert that all physical .sql files in database/migrations/ are present in DATABASE_MIGRATIONS
    const MIGRATIONS_DIR = path.resolve('database/migrations');
    const physicalSqlFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'));

    for (const physicalFile of physicalSqlFiles) {
      const migrationId = physicalFile.replace(/\.sql$/, '');
      const registered = DATABASE_MIGRATIONS.some(m => m.id === migrationId);
      assert.ok(registered, `La migración física '${physicalFile}' no está registrada en src/logic/db/migrations_data.ts. Recuerda ejecutar 'npm run migrations:generate'.`);
    }

    for (const migration of DATABASE_MIGRATIONS) {
      const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
      const isSqliteSpec = migration.sqlite_sql !== undefined;
      const statements = splitSQLStatements(sqlSource);
      for (const stmt of statements) {
        if (stmt.trim()) {
          const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
          if (sql) {
            try {
              db.exec(sql);
            } catch (stmtErr: unknown) {
              const msg = (stmtErr as Error).message.toLowerCase();
              const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
              const isMissing = msg.includes('no such column');
              if (!isDuplicate && !isMissing) {
                throw stmtErr;
              }
            }
          }
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
            } else if (poke.id && !canLearnMove(poke.id, m.id)) {
              errors.push(`${tag} - Illegal move for species ${poke.id}: '${m.id}'`);
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
    } else {
      const errorLogPath = path.resolve('scratch/backup_validation_errors.txt');
      if (fs.existsSync(errorLogPath)) {
        fs.unlinkSync(errorLogPath);
      }
    }

    assert.strictEqual(errors.length, 0, `There must be 0 validation errors across all migrated backup saves. Found: ${errors.length}`);
  });
});
