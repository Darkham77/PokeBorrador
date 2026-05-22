-- Migration: 20260418045000_fix_events_and_awards.sql
-- Description: Ensures parity with Supabase schema for events and awards.
-- check: { "table": "events_config", "column": "active" }

-- Las columnas de awards y events_config ahora se manejan vía Auto-Repair en sqliteEngine.js

-- 3. Update DB version tracking
UPDATE system_config SET value = '20260418045000'::jsonb WHERE key = 'db_version';
INSERT INTO _migrations (id) VALUES ('20260418045000_fix_events_and_awards') ON CONFLICT (id) DO NOTHING;
