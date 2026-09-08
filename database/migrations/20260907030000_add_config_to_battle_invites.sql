-- Migration: 20260907030000_add_config_to_battle_invites.sql
-- Description: Add config JSONB column to battle_invites for PvP match format, rules, and arena configurations.

ALTER TABLE public.battle_invites ADD COLUMN IF NOT EXISTS config JSONB;

INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260907030000'::jsonb) 
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
