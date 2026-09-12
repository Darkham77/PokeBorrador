-- Migration: 20260911020000_deactivate_corrupted_passive_teams.sql
-- Description: Deactivate corrupted passive teams missing abilities or moves to prevent runtime battle crashes.

-- 1. Deactivate passive teams where any pokemon in team_data lacks an ability
UPDATE public.passive_teams
SET is_active = FALSE
WHERE is_active = TRUE
  AND (
    team_data IS NULL
    OR team_data::text NOT LIKE '%"ability"%'
  );

-- 2. Version bump
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260911020000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
