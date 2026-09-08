-- Migration: 20260908060000_grant_awards_insert_policy.sql
-- Description: Grant privileges and define RLS policies for public.awards and public.claim_queue to authenticated players.

-- 1. public.awards
GRANT SELECT, INSERT, UPDATE, DELETE ON public.awards TO authenticated;

DROP POLICY IF EXISTS "Players can insert own awards" ON public.awards;
CREATE POLICY "Players can insert own awards" ON public.awards 
  FOR INSERT WITH CHECK ((select auth.uid()) = winner_id);

-- 2. public.claim_queue
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_queue TO authenticated;

DROP POLICY IF EXISTS "Players can insert own claim" ON public.claim_queue;
CREATE POLICY "Players can insert own claim" ON public.claim_queue 
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players can delete own claim" ON public.claim_queue;
CREATE POLICY "Players can delete own claim" ON public.claim_queue 
  FOR DELETE USING ((select auth.uid()) = user_id);

-- 3. Version bump
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260908060000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
