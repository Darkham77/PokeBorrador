-- =====================================================
-- POKÉ VICIO — MIGRACIÓN: SEGURIDAD (BAN PROTOCOL)
-- Fecha: 2026-04-24
-- Descripción: Agrega soporte para el protocolo de ban automático por uso indebido de herramientas de debug.
-- =====================================================

-- 1. Agregar columnas a profiles (una por sentencia para compatibilidad SQLite)
ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;

-- 2. Actualizar versión de DB
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260424083000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
