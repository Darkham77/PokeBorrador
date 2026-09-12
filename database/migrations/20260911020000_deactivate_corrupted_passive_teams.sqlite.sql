-- SQLite Companion Migration: 20260911020000_deactivate_corrupted_passive_teams
-- Description: Deactivate corrupted passive teams missing abilities or moves in SQLite.

UPDATE passive_teams
SET is_active = 0
WHERE is_active = 1
  AND (
    team_data IS NULL
    OR team_data NOT LIKE '%"ability"%'
  );

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260911020000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
