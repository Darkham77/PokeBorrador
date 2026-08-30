-- SQLite Migration: 20260830000000_reset_friendship_on_claim_asset
-- Description: Updates db_version for friendship reset on claim asset parity.

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260830000000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
