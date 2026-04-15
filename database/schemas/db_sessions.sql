-- =====================================================
-- SISTEMA DE SESIÓN ÚNICA — Poké Vicio
-- Ejecutar en el Editor SQL de Supabase
-- =====================================================

-- 1. Agregar columna de sesión activa a la tabla de perfiles
-- Esta columna almacenará el ID único de la pestaña/navegador actual.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_session_id TEXT;

-- 2. Asegurar que Realtime esté habilitado para la tabla profiles
-- Esto permite que las pestañas "viejas" detecten cambios al instante.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;

-- 3. (Opcional) Política de RLS para que el usuario solo pueda actualizar su propio session_id
-- Asumiendo que ya existen políticas, esta asegura que nadie más pueda "patearte".
DROP POLICY IF EXISTS "Actualizar propia sesión" ON profiles;
CREATE POLICY "Actualizar propia sesión" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
