-- Migration: Update Global Chat Schema
-- ID: 20260421080000_update_chat_schema
-- Description: Adds user_id, username, player_class, and trainer_level to global_chat_messages to match Supabase schema.
-- check: { "table": "global_chat_messages", "column": "user_id" }

ALTER TABLE global_chat_messages ADD COLUMN user_id TEXT;
ALTER TABLE global_chat_messages ADD COLUMN username TEXT;
ALTER TABLE global_chat_messages ADD COLUMN player_class TEXT;
ALTER TABLE global_chat_messages ADD COLUMN trainer_level INTEGER;

-- Record migration and update version
UPDATE system_config SET value = '20260421080000' WHERE key = 'db_version';
INSERT INTO _migrations (id) VALUES ('20260421080000_update_chat_schema') ON CONFLICT (id) DO NOTHING;
