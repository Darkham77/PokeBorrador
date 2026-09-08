-- SQLite companion for 20260907030000_add_config_to_battle_invites
-- In SQLite, config TEXT was already added to TABLES_SCHEMA.

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260907030000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
