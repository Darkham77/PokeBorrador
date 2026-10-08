-- SQLite Companion Migration: 20261008080000_harden_supabase_postgres_best_practices.sqlite.sql
-- Description: Offline parity for trainer_public_profiles view and performance indexes.

DROP VIEW IF EXISTS trainer_public_profiles;
CREATE VIEW trainer_public_profiles AS
SELECT 
  p.*,
  COALESCE(CAST(json_extract(s.save_data, '$.classXP') AS INTEGER), 0) AS class_xp,
  COALESCE(json_array_length(json_extract(s.save_data, '$.pokedex')), 0) AS pokedex_caught,
  COALESCE(json_array_length(json_extract(s.save_data, '$.seenPokedex')), 0) AS pokedex_seen,
  COALESCE(CAST(json_extract(s.save_data, '$.stats.trainersDefeated') AS INTEGER), 0) AS trainers_defeated,
  COALESCE(CAST(json_extract(s.save_data, '$.stats.wins') AS INTEGER), 0) AS wild_wins,
  COALESCE(CAST(json_extract(s.save_data, '$.warCoins') AS INTEGER), 0) AS war_coins,
  COALESCE(json_extract(s.save_data, '$.defeatedGyms'), '[]') AS defeated_gyms
FROM profiles p
LEFT JOIN game_saves s ON p.id = s.user_id;

CREATE INDEX IF NOT EXISTS idx_profiles_elo_rating ON profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type_created ON chat_messages(type, created_at ASC);

INSERT INTO system_config (key, value, updated_at) 
VALUES ('db_version', '20261008080000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
