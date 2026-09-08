-- SQLite Companion Migration: 20260908070000_resilient_claim_asset_jsonb_parsing
-- Description: Parity bump for resilient claim_asset_v2 JSONB parsing.

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260908070000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
