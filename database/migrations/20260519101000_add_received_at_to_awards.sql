-- Migration: 20260519101000_add_received_at_to_awards.sql
-- Description: Adds received_at column to awards table to keep parity with frontend and schema.json.
-- check: { "table": "awards", "column": "received_at" }

ALTER TABLE public.awards ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Update DB version tracking
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260519101000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
