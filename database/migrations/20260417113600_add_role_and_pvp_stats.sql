-- =====================================================
-- POKÉ VICIO — MIGRATION: ADD ROLE AND PVP STATS
-- Fecha: 2026-04-17
-- Descripción: Añade soporte para roles administrativos y estadísticas de PvP en perfiles.
-- =====================================================

-- 1. Añadir columna de rol a perfiles (por defecto 'user')
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Asegurarse de que las columnas de estadísticas de PvP existan (Paridad con SQLite)
-- Nota: elo_rating ya existía en el baseline pero lo reafirmamos por seguridad.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pvp_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pvp_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pvp_draws INTEGER DEFAULT 0;

-- 3. Tabla para reglas de temporadas (Paridad con SQLite)
CREATE TABLE IF NOT EXISTS public.ranked_rules_config (
    id TEXT PRIMARY KEY,
    season_name TEXT,
    config JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Registro inicial de temporada por defecto
INSERT INTO public.ranked_rules_config (id, season_name, config)
VALUES ('current', 'Temporada Global 1', '{"min_level": 5, "max_level": 50}')
ON CONFLICT (id) DO NOTHING;

/* 
-- EJEMPLO: Cómo asignar un administrador manualmente
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'kodrol77@gmail.com';
*/

-- Establish version 20260417113600
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260417113600'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
