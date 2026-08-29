// fallow-ignore-file security-sink
/**
 * scripts/auditors/persistence/_testDbHelper.ts
 * 
 * Shared test database setup and base schema initialization for persistence validators.
 */

import { type DatabaseSync } from 'node:sqlite';

export function initTestDatabaseSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_saves (
      user_id TEXT PRIMARY KEY,
      save_data TEXT,
      last_save_id TEXT,
      updated_at TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
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
}
