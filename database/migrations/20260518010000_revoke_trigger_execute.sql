-- =====================================================
-- DATABASE HARDENING: REVOKE TRIGGER FUNCTION EXECUTION
-- Fecha: 2026-05-18
-- Descripción: Restringe la ejecución directa de funciones de trigger por roles de cliente
-- =====================================================

-- 1. Revocar permisos de ejecución en funciones de trigger para evitar ejecuciones directas vía RPC/REST
REVOKE EXECUTE ON FUNCTION public.validate_game_save() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_global_chat_messages() FROM PUBLIC, anon, authenticated;

-- 2. Actualizar versión de la base de datos
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518010000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
