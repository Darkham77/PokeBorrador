-- SQLite companion for 20260906000000_create_fn_award_ranked_season_automated
-- In SQLite / local mode, fn_award_ranked_season_automated and record_passive_battle_result are emulated in typescript (rankedRpc.ts).

CREATE TABLE IF NOT EXISTS ranked_rules_config (
    id TEXT PRIMARY KEY,
    season_name TEXT DEFAULT 'TEMPORADA ACTUAL',
    config TEXT DEFAULT '{}',
    last_awarded_at TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS passive_battle_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    opponent_id TEXT,
    result TEXT,
    report_data TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260906000000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
