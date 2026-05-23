
/**
 * schema.ts
 * Database schema definitions for SQLite local mode.
 * Synchronized with database/migrations and database/schemas.
 */

export const TABLES_SCHEMA: string[] = [
  "profiles (id TEXT PRIMARY KEY, username TEXT, email TEXT, trainer_level INTEGER DEFAULT 1, player_class TEXT, faction TEXT, nick_style TEXT, avatar_style TEXT, role TEXT DEFAULT 'user', elo_rating INTEGER DEFAULT 1000, pvp_wins INTEGER DEFAULT 0, pvp_losses INTEGER DEFAULT 0, pvp_draws INTEGER DEFAULT 0, badges INTEGER DEFAULT 0, current_session_id TEXT, db_version INTEGER DEFAULT 1, last_renamed_at TEXT, created_at TEXT, updated_at TEXT)",
  "game_saves (user_id TEXT PRIMARY KEY, save_data TEXT, last_save_id TEXT, updated_at TEXT)",
  "friendships (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id TEXT, addressee_id TEXT, status TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "battle_invites (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, opponent_id TEXT, status TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "ranked_queue (user_id TEXT PRIMARY KEY, elo INTEGER DEFAULT 1000, status TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "global_chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, username TEXT, message TEXT, player_class TEXT, trainer_level INTEGER, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "passive_teams (user_id TEXT PRIMARY KEY, team_data TEXT, updated_at TEXT)",
  "passive_battle_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, opponent_id TEXT, result TEXT, report_data TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "daycare_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id TEXT, slot_index INTEGER, deposited_at TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "daycare_upgrades (player_id TEXT PRIMARY KEY, egg_capacity INTEGER DEFAULT 1, slot_boost INTEGER DEFAULT 0, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "pokedex_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id INTEGER, status TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "trade_offers (id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT, offer_pokemon TEXT, offer_items TEXT, offer_money INTEGER DEFAULT 0, request_pokemon TEXT, request_items TEXT, request_money INTEGER DEFAULT 0, message TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "events_config (id TEXT PRIMARY KEY, name TEXT, description TEXT, icon TEXT, type TEXT, config TEXT, active BOOLEAN, manual BOOLEAN, start_at TEXT, end_at TEXT, schedule TEXT, last_awarded_at TEXT, updated_at TEXT)",
  "chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, senderId TEXT, senderName TEXT, message TEXT, type TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "market_listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, seller_name TEXT, listing_type TEXT, data TEXT, price INTEGER, status TEXT, buyer_id TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "ranked_rules_config (id TEXT PRIMARY KEY, season_name TEXT, config TEXT, updated_at TEXT)",
  "war_dominance (week_id TEXT, map_id TEXT, winner_faction TEXT, union_points INTEGER DEFAULT 0, poder_points INTEGER DEFAULT 0, resolved_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), PRIMARY KEY (week_id, map_id))",
  "war_points (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id TEXT, map_id TEXT, faction TEXT, points INTEGER DEFAULT 0, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), UNIQUE (week_id, map_id, faction))",
  "war_user_points (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, map_id TEXT, week_id TEXT, points INTEGER DEFAULT 0, faction TEXT, updated_at TEXT)",
  "war_coins (user_id TEXT PRIMARY KEY, total_earned INTEGER DEFAULT 0, total_spent INTEGER DEFAULT 0, updated_at TEXT)",
  "guardian_captures (capture_date TEXT, map_id TEXT, user_id TEXT, winner_faction TEXT, pts_awarded INTEGER DEFAULT 150, captured_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), PRIMARY KEY (capture_date, map_id, user_id))",
  "eggs (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, egg_id TEXT, steps_remaining INTEGER DEFAULT 1000, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "awards (id TEXT PRIMARY KEY, event_id TEXT, winner_id TEXT, winner_email TEXT, winner_name TEXT, prize TEXT, awarded_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), claimed BOOLEAN DEFAULT 0, claimed_at TEXT, received_at TEXT)",
  "competition_entries (id TEXT PRIMARY KEY, event_id TEXT, player_id TEXT, player_name TEXT, player_email TEXT, data TEXT, submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "competition_results (id TEXT PRIMARY KEY, event_id TEXT, winners TEXT, ended_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "war_factions (user_id TEXT PRIMARY KEY, email TEXT, faction TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "war_defenders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, map_id TEXT, pokemon_uid TEXT, pokemon_data TEXT, wins_count INTEGER DEFAULT 0, week_id TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "claim_queue (id TEXT PRIMARY KEY, user_id TEXT, source_type TEXT, source_id TEXT, asset_data TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))",
  "system_config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)",
  "config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)"
]
