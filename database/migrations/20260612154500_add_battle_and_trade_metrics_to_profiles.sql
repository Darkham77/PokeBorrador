-- =====================================================
-- MIGRACIÓN: AGREGAR MÉTRICAS DE DAÑO, BATALLAS, INTERCAMBIOS Y CAPTURAS A PERFILES — Poké Vicio
-- Fecha: 2026-06-12
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_damage INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_battles INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trade_volume INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS capture_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS capture_successes INTEGER DEFAULT 0;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '"20260612154500"'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
