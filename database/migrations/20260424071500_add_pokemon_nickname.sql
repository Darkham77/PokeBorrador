-- =====================================================
-- POKÉ VICIO — MIGRACIÓN: APODOS (NICKNAMES)
-- Fecha: 2026-04-24
-- Descripción: Incrementa la versión de DB para habilitar la personalización de nombres en Pokémon.
-- =====================================================

-- Actualizar versión de DB a 20260424071500
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260424071500'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
