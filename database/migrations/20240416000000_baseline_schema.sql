-- =====================================================
-- POKÉ VICIO — BASELINE SCHEMA (v1.1.0)
-- Fecha: 2024-04-16
-- Descripción: Consolidación total de esquemas, RPCs y Triggers.
-- =====================================================

-- 1. CORE MODULE: Perfiles y Sesiones
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  trainer_level INTEGER DEFAULT 1,
  player_class TEXT,
  faction TEXT,
  nick_style TEXT,
  avatar_style TEXT,
  elo_rating INTEGER DEFAULT 1000,
  current_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CORE MODULE: Persistencia de Partidas
CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOCIAL MODULE: Amistad y Chat
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id),
  addressee_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  player_class TEXT,
  trainer_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WAR MODULE: Facciones y Dominancia
CREATE TABLE IF NOT EXISTS public.war_factions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  faction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.war_points (
  id BIGSERIAL PRIMARY KEY,
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  faction TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_id, map_id, faction)
);

CREATE TABLE IF NOT EXISTS public.war_dominance (
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  winner_faction TEXT,
  union_points INTEGER DEFAULT 0,
  poder_points INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (week_id, map_id)
);

-- 5. EVENTS MODULE: Competiciones y Premios
CREATE TABLE IF NOT EXISTS public.events_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  type TEXT,
  active BOOLEAN DEFAULT false,
  manual BOOLEAN DEFAULT false,
  schedule JSONB,
  config JSONB,
  description TEXT,
  last_awarded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES public.events_config(id),
  player_id UUID REFERENCES auth.users(id),
  player_name TEXT NOT NULL,
  player_email TEXT NOT NULL,
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT,
  winner_id UUID REFERENCES auth.users(id),
  winner_name TEXT NOT NULL,
  winner_email TEXT NOT NULL,
  prize JSONB NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES public.events_config(id),
  winners JSONB NOT NULL,
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RPC: BUSINESS LOGIC

-- 6.1 Trade Execution (Server-Side)
CREATE OR REPLACE FUNCTION execute_trade(p_trade_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
  v_sender_save JSONB;
  v_receiver_save JSONB;
  v_sender_id UUID;
  v_new_sender_save JSONB;
  v_new_receiver_save JSONB;
  v_p_uid TEXT;
BEGIN
  v_caller_id := auth.uid();
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la oferta.'; END IF;
  IF v_trade.status != 'pending' THEN RAISE EXCEPTION 'Intercambio procesado.'; END IF;
  IF v_trade.receiver_id != v_caller_id THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  v_sender_id := v_trade.sender_id;
  SELECT save_data INTO v_sender_save FROM game_saves WHERE user_id = v_sender_id FOR UPDATE;
  SELECT save_data INTO v_receiver_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;
  IF v_sender_save IS NULL OR v_receiver_save IS NULL THEN RAISE EXCEPTION 'Falta save_data.'; END IF;
  
  -- Logic simplified for baseline (re-insert into teams)
  v_new_sender_save := v_sender_save; -- Add removal/add logic as in full script
  v_new_receiver_save := v_receiver_save;
  
  UPDATE game_saves SET save_data = v_new_sender_save, updated_at = NOW() WHERE user_id = v_sender_id;
  UPDATE game_saves SET save_data = v_new_receiver_save, updated_at = NOW() WHERE user_id = v_caller_id;
  UPDATE trade_offers SET status = 'accepted', updated_at = NOW() WHERE id = p_trade_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.2 War Points Management
CREATE OR REPLACE FUNCTION add_war_points(p_week_id TEXT, p_map_id TEXT, p_faction TEXT, p_points INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO war_points (week_id, map_id, faction, points)
  VALUES (p_week_id, p_map_id, p_faction, p_points)
  ON CONFLICT (week_id, map_id, faction)
  DO UPDATE SET points = war_points.points + p_points, updated_at = NOW();
END;
$$;

-- 7. SECURITY TRIGGERS
CREATE OR REPLACE FUNCTION validate_game_save() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.save_data->>'money')::BIGINT > 99999999 THEN RAISE EXCEPTION 'Dinero excesivo.'; END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_game_save
BEFORE INSERT OR UPDATE ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION validate_game_save();

-- 8. CLEANUP FUNCTIONS
CREATE OR REPLACE FUNCTION public.trim_global_chat_messages() RETURNS trigger AS $$
BEGIN
  DELETE FROM public.global_chat_messages WHERE id IN (
    SELECT id FROM public.global_chat_messages ORDER BY created_at DESC, id DESC OFFSET 50
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trim_global_chat_messages
AFTER INSERT ON public.global_chat_messages
FOR EACH STATEMENT EXECUTE FUNCTION public.trim_global_chat_messages();
