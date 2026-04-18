-- Migration: Add System Config table and DB Version
-- Date: 2024-04-16
-- Version: 20240416000001

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed version 20240416000001 if not exists
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20240416000001'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Establish version 20240416000001
UPDATE public.system_config 
SET value = jsonb_build_object('db_version', '20240416000001'),
    updated_at = NOW()
WHERE key = 'db_version';
