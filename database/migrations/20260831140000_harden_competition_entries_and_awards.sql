-- Migration: 20260831140000_harden_competition_entries_and_awards.sql
-- Purpose:
-- 1. Ensure category_id and pokemon_uid exist on public.competition_entries with composite unique constraint.
-- 2. Add missing DELETE RLS policy for public.awards to allow players to safely discard awards.
-- 3. Bump db_version to 20260831140000.

-- 1. competition_entries schema evolution
ALTER TABLE public.competition_entries 
  ADD COLUMN IF NOT EXISTS category_id TEXT NOT NULL DEFAULT 'ivs';

ALTER TABLE public.competition_entries 
  ADD COLUMN IF NOT EXISTS pokemon_uid TEXT;

DO $$
BEGIN
  -- Drop legacy single-entry constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'competition_entries_event_id_player_id_key'
  ) THEN
    ALTER TABLE public.competition_entries DROP CONSTRAINT competition_entries_event_id_player_id_key;
  END IF;

  -- Add composite multi-category constraint if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'competition_entries_event_id_category_id_player_id_key'
  ) THEN
    ALTER TABLE public.competition_entries 
      ADD CONSTRAINT competition_entries_event_id_category_id_player_id_key 
      UNIQUE(event_id, category_id, player_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competition_entries_event_cat 
  ON public.competition_entries(event_id, category_id);

-- 2. public.awards RLS Delete Policy
DROP POLICY IF EXISTS "Players can delete own awards" ON public.awards;
CREATE POLICY "Players can delete own awards" ON public.awards 
  FOR DELETE USING ((select auth.uid()) = winner_id);

-- 3. Bump database version
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260831140000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
