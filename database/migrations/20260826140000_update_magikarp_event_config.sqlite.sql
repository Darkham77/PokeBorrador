-- SQLite Companion Migration: 20260826140000_update_magikarp_event_config
-- Description: Updates hora_magikarp event config to enable requireCaughtDuringEvent restriction.

UPDATE events_config
SET config = '{"species": "magikarp", "metric": "total_ivs", "hasCompetition": true, "requireCaughtDuringEvent": true}'
WHERE id = 'hora_magikarp';

INSERT OR REPLACE INTO system_config (key, value) VALUES ('db_version', '"20260826140000"');
