-- PostgreSQL Migration: 20260828130000_reorganize_monthly_events_schedule
-- Description: Reorganizes monthly events schedule: moves Community Day to last_sunday strictly, and Faction War to second_weekend.

UPDATE public.events_config
SET schedule = '{"type": "monthly", "trigger": "last_sunday", "startHour": 0, "endHour": 23.99}',
    description = '¡Gran evento mensual! Spawns x3 y Shiny x4 para el Pokémon destacado del mes (exclusivo domingos de fin de mes).'
WHERE id = 'comunidad_mensual';

UPDATE public.events_config
SET schedule = '{"type": "monthly", "trigger": "second_weekend", "startHour": 0, "endHour": 23.99}',
    description = '¡Batallas territoriales épicas! Puntos de facción dobles y 2x Battle Coins durante el 2do fin de semana de cada mes.'
WHERE id = 'guerra_facciones_mensual';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260828130000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
