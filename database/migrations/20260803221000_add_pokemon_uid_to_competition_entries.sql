-- Add missing pokemon_uid column to competition_entries
ALTER TABLE public.competition_entries ADD COLUMN IF NOT EXISTS pokemon_uid TEXT;
