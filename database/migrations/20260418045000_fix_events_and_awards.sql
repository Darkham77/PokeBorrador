-- Migration: 20260418045000_fix_events_and_awards.sql
-- Description: Ensures parity with Supabase schema for events and awards.

-- 1. Update events_config schema
ALTER TABLE events_config RENAME COLUMN is_active TO active;

-- 2. Update awards schema
ALTER TABLE awards ADD COLUMN received_at TEXT;
ALTER TABLE awards ADD COLUMN winner_id TEXT;

-- 3. Update DB version tracking
UPDATE config SET value = '202604180450' WHERE key = 'db_version';
INSERT OR IGNORE INTO _migrations (id) VALUES ('202604180450_fix_events_and_awards');
