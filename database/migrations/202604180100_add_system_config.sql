-- Migration: Add System Config table and DB Version
-- Date: 2026-04-18
-- Version: 202604180100

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed version 202604180100 if not exists
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '202604180100'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Establish version 202604180100
UPDATE public.system_config 
SET value = jsonb_build_object('db_version', '202604180100'),
    updated_at = NOW()
WHERE key = 'db_version';
