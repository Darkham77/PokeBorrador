-- =====================================================
-- FIX: GLOBAL CHAT REALTIME SUBSCRIPTION
-- Fecha: 2026-05-21
-- Descripción:
--   Corrige el problema donde los mensajes del chat global se insertan
--   correctamente pero no se reciben via Supabase Realtime (postgres_changes).
--
--   Causa raíz: Supabase Realtime requiere dos condiciones para funcionar
--   con tablas que tienen RLS habilitado:
--   1. REPLICA IDENTITY FULL (permite filtrar filas por RLS en Realtime)
--   2. La tabla debe estar en la publicación supabase_realtime
--   3. El rol supabase_realtime necesita permiso de SELECT
--
--   La tabla global_chat_messages estaba en el backup legacy pero nunca
--   fue añadida formalmente a la publicación mediante una migración.
-- =====================================================

-- 1. Configurar REPLICA IDENTITY FULL para que Realtime pueda
--    leer y filtrar las filas nuevas respetando las políticas RLS.
ALTER TABLE public.global_chat_messages REPLICA IDENTITY FULL;

-- 2. Añadir la tabla a la publicación de Realtime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'global_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- 3. Asegurar que el rol interno de Realtime tiene permiso SELECT
--    (puede haberse perdido en la migración 20260518030000 que restringió anon)
--    Este rol solo existe en instancias Supabase cloud; en self-hosted puede no existir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_realtime') THEN
    GRANT SELECT ON public.global_chat_messages TO supabase_realtime;
  END IF;
END $$;

-- 4. Registrar versión
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260521190000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
