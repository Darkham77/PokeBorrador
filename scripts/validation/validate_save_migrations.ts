// fallow-ignore-file security-sink
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Dex } from '@pkmn/sim';
import { splitSQLStatements } from '../../src/logic/db/sqlTranslator.ts';

interface SavePokemon {
  heldItem?: string;
}

interface SaveData {
  inventory?: Record<string, number>;
  team?: Array<SavePokemon | null>;
  box?: Array<SavePokemon | null>;
}

interface GameSaveRow {
  user_id: string;
  save_data: string;
}

interface ItemsCatalog {
  SHOP_ITEMS: Array<{ id: string }>;
}

async function main() {
  const backupRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
  const backupPath = path.resolve(backupRelPath);
  if (!fs.existsSync(backupPath)) {
    console.error(`Error: Backup file not found at ${backupRelPath}`);
    process.exit(1);
  }

  console.log('Loading items catalog...');
  const itemsDict = JSON.parse(fs.readFileSync(path.resolve('src/data/inventory/items.json'), 'utf8')) as ItemsCatalog;
  const validItemIds = new Set(itemsDict.SHOP_ITEMS.map((item) => item.id));

  console.log('Loading backup saves fixture...');
  const backupContent = fs.readFileSync(backupPath, 'utf8');
  const backupData = JSON.parse(backupContent) as { data: { game_saves?: GameSaveRow[] } };
  const gameSaves: GameSaveRow[] = backupData.data.game_saves ?? [];

  console.log(`Found ${gameSaves.length} saves in backup.`);

  // Collect all unique item IDs present in the backup BEFORE migrations
  const originalItems = new Set<string>();
  for (const row of gameSaves) {
    const saveData = (typeof row.save_data === 'string' ? JSON.parse(row.save_data) : row.save_data) as SaveData | null;
    if (!saveData) continue;

    // Inventory keys
    if (saveData.inventory) {
      for (const key of Object.keys(saveData.inventory)) {
        originalItems.add(key);
      }
    }

    // Held items
    const team: Array<SavePokemon | null> = saveData.team ?? [];
    const box: Array<SavePokemon | null> = saveData.box ?? [];
    for (const poke of [...team, ...box]) {
      if (poke?.heldItem) {
        originalItems.add(poke.heldItem);
      }
    }
  }

  console.log(`Found ${originalItems.size} unique item IDs in the raw backup.`);

  // Initialize SQLite in-memory DB and populate it
  console.log('Initializing in-memory database...');
  using db = new DatabaseSync(':memory:');
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

  const insertStmt = db.prepare(`
    INSERT INTO game_saves (user_id, save_data)
    VALUES (?, ?)
  `);

  for (const row of gameSaves) {
    const saveDataStr = typeof row.save_data === 'string' ? row.save_data : JSON.stringify(row.save_data);
    insertStmt.run(row.user_id || 'test_user', saveDataStr);
  }

  // Load migrations
  console.log('Running migrations...');
  const { DATABASE_MIGRATIONS } = await import('../../src/logic/db/migrations_data.ts');
  const { translatePostgresToSqlite } = await import('../../src/logic/db/sqlTranslator.ts');

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
              console.error(`Migration error in ${migration.id}:`, stmtErr);
              throw stmtErr;
            }
          }
        }
      }
    }
  }

  // Audit database saves after migration
  console.log('Auditing saves after migration...');
  const selectStmt = db.prepare('SELECT save_data FROM game_saves');
  const rows = selectStmt.all() as { save_data: string }[];

  const checkItemValidity = (key: string): boolean => {
    const isTM = key.startsWith('tm') || key.startsWith('hm');
    if (isTM) return true;
    if (validItemIds.has(key)) return true;
    if (Dex.items.get(key).exists) return true;
    return false;
  };

  const unmigratedItems = new Set<string>();
  for (const row of rows) {
    const saveData = JSON.parse(row.save_data) as SaveData | null;
    if (!saveData) continue;

    // Check inventory
    if (saveData.inventory) {
      for (const key of Object.keys(saveData.inventory)) {
        if (!checkItemValidity(key)) {
          unmigratedItems.add(key);
        }
      }
    }

    // Check held items
    const team: Array<SavePokemon | null> = saveData.team ?? [];
    const box: Array<SavePokemon | null> = saveData.box ?? [];
    for (const poke of [...team, ...box]) {
      if (poke?.heldItem) {
        if (!checkItemValidity(poke.heldItem)) {
          unmigratedItems.add(poke.heldItem);
        }
      }
    }
  }

  console.log('\n--- VERIFICATION RESULT ---');
  if (unmigratedItems.size === 0) {
    console.log('✅ SUCCESS: All item IDs in backup saves are successfully migrated to valid official item IDs!');
    process.exit(0);
  } else {
    console.error('❌ FAILURE: Found item IDs after migrations that do not exist in the official items catalog:');
    for (const item of unmigratedItems) {
      console.error(` - ${item}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
