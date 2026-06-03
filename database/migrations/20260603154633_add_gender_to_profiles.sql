-- =====================================================
-- MIGRACIÓN: AGREGAR GÉNERO A PERFILES — Poké Vicio
-- Fecha: 2026-06-03
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'h';
