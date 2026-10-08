-- Migration: 20261008080000_harden_supabase_postgres_best_practices.sql
-- Description: Implement Supabase Postgres best practices:
-- 1. Create secure public projection view (trainer_public_profiles) with zero data duplication.
-- 2. Isolate game_saves table to owner only via RLS (auth.uid() = user_id).
-- 3. Isolate private chat messages to sender and receiver via RLS.
-- 4. Add high-performance partial and composite indexes.
-- 5. Add financial check constraints to market_listings and trade_offers.
-- 6. Restrict system automated awarding RPC execution to service_role.
-- 7. Clean up redundant permissive policies.

-- 1. Create or replace secure public projection view (trainer_public_profiles)
CREATE OR REPLACE VIEW public.trainer_public_profiles 
WITH (security_invoker = false) AS
SELECT 
  p.id,
  p.username,
  p.trainer_level,
  p.player_class,
  p.faction,
  p.avatar_style,
  p.nick_style,
  p.gender,
  p.role,
  p.elo_rating,
  p.pvp_wins,
  p.pvp_losses,
  p.pvp_draws,
  p.badges,
  p.playtime,
  p.created_at,
  p.last_played_at,
  p.ranked_max_elo,
  p.class_level,
  p.box_count,
  p.longest_streak,
  p.shiny_count,
  p.max_damage,
  p.total_battles,
  p.trade_volume,
  p.capture_attempts,
  p.capture_successes,
  COALESCE((s.save_data->>'classXP')::INTEGER, 0) AS class_xp,
  COALESCE(jsonb_array_length(s.save_data->'pokedex'), 0) AS pokedex_caught,
  COALESCE(jsonb_array_length(s.save_data->'seenPokedex'), 0) AS pokedex_seen,
  COALESCE((s.save_data->'stats'->>'trainersDefeated')::INTEGER, 0) AS trainers_defeated,
  COALESCE((s.save_data->'stats'->>'wins')::INTEGER, 0) AS wild_wins,
  COALESCE((s.save_data->>'warCoins')::INTEGER, 0) AS war_coins,
  COALESCE(s.save_data->'defeatedGyms', '[]'::jsonb) AS defeated_gyms
FROM public.profiles p
LEFT JOIN public.game_saves s ON p.id = s.user_id;

GRANT SELECT ON public.trainer_public_profiles TO anon, authenticated, service_role;

-- 2. Isolate game_saves table to owner only via RLS
DROP POLICY IF EXISTS "Lectura propia y amigos" ON public.game_saves;
DROP POLICY IF EXISTS "Lectura propio guardado" ON public.game_saves;
CREATE POLICY "Lectura propio guardado" ON public.game_saves 
  FOR SELECT USING ((select auth.uid()) = user_id);

-- 3. Isolate private chat messages
DROP POLICY IF EXISTS "Lectura para usuarios autenticados chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Lectura privada chat_messages" ON public.chat_messages;
CREATE POLICY "Lectura privada chat_messages" ON public.chat_messages 
  FOR SELECT USING (
    (select auth.uid()) = "senderId" 
    OR type = 'private:' || (select auth.uid())::text
  );

-- 4. High-performance partial and composite indexes
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rating ON public.profiles(elo_rating DESC);

CREATE INDEX IF NOT EXISTS idx_market_listings_active_created 
  ON public.market_listings(created_at DESC) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ranked_queue_searching_elo 
  ON public.ranked_queue(elo) 
  WHERE status = 'searching';

CREATE INDEX IF NOT EXISTS idx_awards_unclaimed 
  ON public.awards(winner_id, awarded_at DESC) 
  WHERE claimed = false;

CREATE INDEX IF NOT EXISTS idx_battle_invites_pending 
  ON public.battle_invites(opponent_id, created_at DESC) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_chat_messages_type_created 
  ON public.chat_messages(type, created_at ASC);

-- 5. Add financial check constraints idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_market_price_positive') THEN
    ALTER TABLE public.market_listings ADD CONSTRAINT check_market_price_positive CHECK (price > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_trade_money_positive') THEN
    ALTER TABLE public.trade_offers ADD CONSTRAINT check_trade_money_positive CHECK (offer_money >= 0 AND request_money >= 0);
  END IF;
END $$;

-- 6. Restrict system automated awarding RPC execution to service_role
REVOKE EXECUTE ON FUNCTION public.fn_award_ranked_season_automated(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_award_ranked_season_automated(TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_award_event_automated(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_award_event_automated(TEXT) TO service_role;

-- 7. Clean up redundant permissive policies
DROP POLICY IF EXISTS "Public read events" ON public.events_config;
DROP POLICY IF EXISTS "Actualizar propia sesión" ON public.profiles;
DROP POLICY IF EXISTS "Upsert autenticado" ON public.war_points;
DROP POLICY IF EXISTS "Update autenticado" ON public.war_points;

-- 8. Monotonic DB version record
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20261008080000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
