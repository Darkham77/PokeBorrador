-- =====================================================
-- MIGRACIÓN: AGREGAR TIEMPO DE JUEGO Y MÉTRICAS DE ACTIVIDAD A PERFILES — Poké Vicio
-- Fecha: 2026-06-12
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS playtime INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ranked_max_elo INTEGER DEFAULT 1000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pvp_draws INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shiny_count INTEGER DEFAULT 0;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '"20260612152800"'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
