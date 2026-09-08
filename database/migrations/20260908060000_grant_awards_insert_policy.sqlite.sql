-- SQLite Companion Migration: 20260908060000_grant_awards_insert_policy
-- Description: Parity bump for awards insert policy.

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260908060000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
