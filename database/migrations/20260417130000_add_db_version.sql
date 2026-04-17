-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SEGURIDAD (v2)
-- Fecha: 2026-04-17
-- Descripción: Añade versionado global para el sistema Anti-Cheat.
-- =====================================================

-- 1. Añadir db_version a perfiles para trackeo de seguridad
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS db_version INTEGER DEFAULT 1;

-- 2. Asegurar que las cuentas nuevas empiecen con v1 para que pasen
-- por la primera auditoría de limpieza en su primer guardado.
-- (Opcionalmente podrías poner DEFAULT 2 si confías en el estado inicial de nuevos).

COMMENT ON COLUMN public.profiles.db_version IS 'Nivel de integridad de la cuenta. v2 incluye blindaje anti-duplicates.';
