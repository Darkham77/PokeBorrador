-- SQLite companion for 20260902011000_fix_fn_award_event_jsonb_and_grants
-- In SQLite / local mode, fn_award_event_automated is emulated in typescript (eventRpc.ts).

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260902011000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
