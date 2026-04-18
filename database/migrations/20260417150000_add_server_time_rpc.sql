-- Migration: Add fn_get_server_time RPC
-- Description: Returns the current server time to ensure mission integrity.
-- Date: 2026-04-17

CREATE OR REPLACE FUNCTION fn_get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

COMMENT ON FUNCTION fn_get_server_time() IS 'Returns the current server time for mission and event synchronization.';

-- Establish version 20260417150000
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260417150000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
