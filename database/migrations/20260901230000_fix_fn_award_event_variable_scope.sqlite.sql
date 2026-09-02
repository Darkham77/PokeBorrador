-- SQLite companion for 20260901230000_fix_fn_award_event_variable_scope
-- In SQLite / local mode, fn_award_event_automated is emulated in typescript (eventRpc.ts).

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260901230000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
