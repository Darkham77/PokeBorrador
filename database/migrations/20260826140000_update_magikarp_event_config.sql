-- PostgreSQL Migration: 20260826140000_update_magikarp_event_config
-- Description: Updates hora_magikarp event config to enable requireCaughtDuringEvent restriction.

UPDATE public.events_config
SET config = '{"species": "magikarp", "metric": "total_ivs", "hasCompetition": true, "requireCaughtDuringEvent": true}'
WHERE id = 'hora_magikarp';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260826140000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
