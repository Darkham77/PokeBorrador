-- Migration (SQLite): 20260831140000_harden_competition_entries_and_awards.sqlite.sql
-- Purpose:
-- 1. Ensure category_id and pokemon_uid exist on competition_entries.
-- 2. Bump db_version in system_config.

INSERT INTO system_config (key, value)
VALUES ('db_version', '20260831140000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
