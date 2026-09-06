-- SQLite companion for 20260907000000_create_battle_replays
-- In SQLite / local mode, fn_publish_battle_replay and fn_get_featured_replays are emulated in TypeScript (rankedRpc.ts).

CREATE TABLE IF NOT EXISTS battle_replays (
    id TEXT PRIMARY KEY,
    battle_code TEXT UNIQUE NOT NULL,
    season_id TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    p1_user_id TEXT,
    p2_user_id TEXT,
    p1_data TEXT NOT NULL,
    p2_data TEXT NOT NULL,
    turns_count INTEGER NOT NULL DEFAULT 0,
    winner_side TEXT NOT NULL,
    choice_stream TEXT NOT NULL DEFAULT '[]',
    initial_seed TEXT NOT NULL DEFAULT '[0,0,0,0]',
    is_top10_archived INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_battle_replays_code ON battle_replays(battle_code);
CREATE INDEX IF NOT EXISTS idx_battle_replays_top10 ON battle_replays(is_top10_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_replays_p1 ON battle_replays(p1_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_replays_p2 ON battle_replays(p2_user_id);

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260907000000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
