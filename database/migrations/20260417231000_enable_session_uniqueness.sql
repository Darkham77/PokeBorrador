-- =====================================================
-- MIGRATION: Auth Session Uniqueness & Realtime
-- Created: 2026-04-17
-- Description: Adds current_session_id to profiles and enables Realtime.
-- =====================================================

-- 1. Ensure profiles table has the necessary columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS db_version INTEGER DEFAULT 1;

-- 2. Enable Realtime for the profiles table to allow session poaching detection
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

-- 3. RLS Policy for session updates
DROP POLICY IF EXISTS "Users can update their own session_id" ON profiles;
CREATE POLICY "Users can update their own session_id" ON profiles 
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Establish version 20260417231000
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260417231000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
