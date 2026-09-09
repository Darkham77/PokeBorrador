-- SQLite Companion Migration: 20260909000000_add_war_dominance_rls_policies
-- Description: Parity bump for war_dominance insert/update policy.

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260909000000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
