-- =====================================================
-- SISTEMA DE DOMINANCIA — Poké Vicio
-- Versión segura: usa IF NOT EXISTS y OR REPLACE
-- Podés ejecutar esto múltiples veces sin errores
-- =====================================================

-- Bando de cada jugador
CREATE TABLE IF NOT EXISTS war_factions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Puntos de territorio acumulados por semana
-- week_id = string tipo "2026-W14" (año-semana ISO)
CREATE TABLE IF NOT EXISTS war_points (
  id BIGSERIAL PRIMARY KEY,
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (week_id, map_id, faction)
);

-- Resultado de dominancia por semana
CREATE TABLE IF NOT EXISTS war_dominance (
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  winner_faction TEXT NOT NULL CHECK (winner_faction IN ('union', 'poder')),
  union_points INTEGER DEFAULT 0,
  poder_points INTEGER DEFAULT 0,
  resolved_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (week_id, map_id)
);

-- Registro del Guardián capturado por mapa/día
CREATE TABLE IF NOT EXISTS guardian_captures (
  capture_date DATE NOT NULL,
  map_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  winner_faction TEXT NOT NULL,
  pts_awarded INTEGER NOT NULL DEFAULT 150,
  captured_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (capture_date, map_id, user_id)
);

-- Monedas de guerra acumuladas históricamente
CREATE TABLE IF NOT EXISTS war_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas (idempotente)
ALTER TABLE war_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_dominance ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_coins ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta (DROP IF EXISTS para evitar duplicados)
DROP POLICY IF EXISTS "Lectura pública" ON war_factions;
DROP POLICY IF EXISTS "Lectura pública" ON war_points;
DROP POLICY IF EXISTS "Lectura pública" ON war_dominance;
DROP POLICY IF EXISTS "Lectura pública" ON guardian_captures;

CREATE POLICY "Lectura pública" ON war_factions FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_points FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_dominance FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON guardian_captures FOR SELECT USING (true);

-- Políticas de escritura (DROP IF EXISTS para evitar duplicados)
DROP POLICY IF EXISTS "Insert propio" ON war_factions;
DROP POLICY IF EXISTS "Update propio" ON war_factions;
DROP POLICY IF EXISTS "Upsert autenticado" ON war_points;
DROP POLICY IF EXISTS "Update autenticado" ON war_points;
DROP POLICY IF EXISTS "Insert autenticado" ON guardian_captures;
DROP POLICY IF EXISTS "Lectura propia monedas" ON war_coins;
DROP POLICY IF EXISTS "Upsert propio monedas" ON war_coins;
DROP POLICY IF EXISTS "Update propio monedas" ON war_coins;

CREATE POLICY "Insert propio" ON war_factions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio" ON war_factions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Upsert autenticado" ON war_points FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update autenticado" ON war_points FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Insert autenticado" ON guardian_captures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Lectura propia monedas" ON war_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Upsert propio monedas" ON war_coins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio monedas" ON war_coins FOR UPDATE USING (auth.uid() = user_id);

-- Función RPC para sumar puntos atómicamente (CREATE OR REPLACE = seguro siempre)
CREATE OR REPLACE FUNCTION add_war_points(
  p_week_id TEXT, p_map_id TEXT, p_faction TEXT, p_points INTEGER
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO war_points (week_id, map_id, faction, points)
  VALUES (p_week_id, p_map_id, p_faction, p_points)
  ON CONFLICT (week_id, map_id, faction)
  DO UPDATE SET points = war_points.points + p_points, updated_at = NOW();
END;
$$;
-- 1. Table for Event Configurations
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

-- Enable RLS for Event Configurations
ALTER TABLE public.events_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read events" ON public.events_config;
CREATE POLICY "Public read events" ON public.events_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write events" ON public.events_config;
CREATE POLICY "Admin write events" ON public.events_config FOR ALL USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- Initialize default events
INSERT INTO public.events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', false, false, '{"type": "weekly", "days": [6, 0]}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', false, false, '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "prize": null}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!')
ON CONFLICT (id) DO NOTHING;

-- 2. Table for Competition Entries
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

-- Enable RLS for Competition Entries
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can enter" ON public.competition_entries;
CREATE POLICY "Players can enter" ON public.competition_entries FOR INSERT WITH CHECK (auth.uid() = player_id);
DROP POLICY IF EXISTS "Players can update own entries" ON public.competition_entries;
CREATE POLICY "Players can update own entries" ON public.competition_entries FOR UPDATE USING (auth.uid() = player_id);
DROP POLICY IF EXISTS "Admin view all entries" ON public.competition_entries;
CREATE POLICY "Admin view all entries" ON public.competition_entries FOR SELECT USING (true);

-- 3. Table for Awards (Prizes)
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

-- Enable RLS for Awards
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view own awards" ON public.awards;
CREATE POLICY "Players can view own awards" ON public.awards FOR SELECT USING (auth.uid() = winner_id);
DROP POLICY IF EXISTS "Players can update own awards" ON public.awards;
CREATE POLICY "Players can update own awards" ON public.awards FOR UPDATE USING (auth.uid() = winner_id);
DROP POLICY IF EXISTS "Admin create awards" ON public.awards;
CREATE POLICY "Admin create awards" ON public.awards FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
DROP POLICY IF EXISTS "Admin view all awards" ON public.awards;
CREATE POLICY "Admin view all awards" ON public.awards FOR SELECT USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- 4. Table for Competition Results (Podium / History)
CREATE TABLE IF NOT EXISTS public.competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES public.events_config(id),
    winners JSONB NOT NULL, -- Array of {rank, player_name, score, player_id}
    ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Competition Results
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read results" ON public.competition_results;
CREATE POLICY "Public read results" ON public.competition_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write results" ON public.competition_results;
CREATE POLICY "Admin write results" ON public.competition_results FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
DROP POLICY IF EXISTS "Admin update results" ON public.competition_results;
CREATE POLICY "Admin update results" ON public.competition_results FOR UPDATE USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- 5. AUTOMATED AWARDING SYSTEM (PostgreSQL RPC)
-- This function is SECURITY DEFINER to bypass RLS and allow any safe distribution.
CREATE OR REPLACE FUNCTION public.fn_award_event_automated(target_event_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_rec RECORD;
    winners_json JSONB;
    prizes_config JSONB;
BEGIN
    -- 1. Get event config and check locks
    SELECT * INTO event_rec FROM public.events_config WHERE id = target_event_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No se encontró el evento.'); END IF;

    -- Avoid awarding if it has no competition or no prizes
    IF (event_rec.config->>'hasCompetition')::boolean IS FALSE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Evento sin competencia.');
    END IF;

    -- Lock to avoid double awarding (< 10 min window or same run)
    IF event_rec.last_awarded_at IS NOT NULL AND (NOW() - event_rec.last_awarded_at < INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Ya premiado recientemente.');
    END IF;

    -- 2. Sort entries (Top 3) by metric (assuming total_ivs for now)
    WITH ranked_entries AS (
        SELECT 
            player_id, player_name, player_email, data,
            ROW_NUMBER() OVER (ORDER BY (COALESCE(data->>'total_ivs', '0'))::int DESC) as rank_num
        FROM public.competition_entries
        WHERE event_id = target_event_id
        LIMIT 3
    )
    SELECT jsonb_agg(jsonb_build_object(
        'rank', CASE rank_num WHEN 1 THEN 'first' WHEN 2 THEN 'second' WHEN 3 THEN 'third' END,
        'player_id', player_id,
        'player_name', player_name,
        'score', (COALESCE(data->>'total_ivs', '0'))::int,
        'entry_data', data
    )) INTO winners_json
    FROM ranked_entries;

    IF winners_json IS NULL OR jsonb_array_length(winners_json) = 0 THEN
        -- Actualizar marca de tiempo aunque no haya ganadores para que deje de intentarlo
        UPDATE public.events_config SET last_awarded_at = NOW() WHERE id = target_event_id;
        RETURN jsonb_build_object('ok', false, 'error', 'Sin participantes.');
    END IF;

    -- 3. Distribute Prizes
    prizes_config := event_rec.config->'prizes';
    
    -- Insert into awards (Winners take it on login)
    FOR i IN 0..jsonb_array_length(winners_json)-1 LOOP
        DECLARE
            w JSONB := winners_json->i;
            p JSONB := prizes_config->(w->>'rank');
        BEGIN
            IF p IS NOT NULL THEN
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES (target_event_id, (w->>'player_id')::uuid, w->>'player_name', 
                       (SELECT player_email FROM competition_entries WHERE player_id = (w->>'player_id')::uuid AND event_id = target_event_id LIMIT 1),
                       p, NOW());
            END IF;
        END;
    END LOOP;

    -- 4. Store Podium Result
    INSERT INTO public.competition_results (event_id, winners, ended_at)
    VALUES (target_event_id, winners_json, NOW());

    -- 5. Mark as Awarded and CLEAN UP entries
    UPDATE public.events_config SET last_awarded_at = NOW() WHERE id = target_event_id;
    DELETE FROM public.competition_entries WHERE event_id = target_event_id;

    RETURN jsonb_build_object('ok', true, 'winners', winners_json);
END;
$$;
-- Global Chat (persistente) - maximo 50 mensajes
-- Ejecutar en Supabase SQL Editor

create table if not exists public.global_chat_messages (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 32),
  message text not null check (char_length(message) between 1 and 240),
  player_class text,
  trainer_level int not null default 1 check (trainer_level between 1 and 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_global_chat_messages_created_at
  on public.global_chat_messages (created_at desc, id desc);

alter table public.global_chat_messages enable row level security;

drop policy if exists global_chat_select_all on public.global_chat_messages;
create policy global_chat_select_all
  on public.global_chat_messages
  for select
  to authenticated
  using (true);

drop policy if exists global_chat_insert_self on public.global_chat_messages;
create policy global_chat_insert_self
  on public.global_chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and trainer_level >= 10
  );

grant select, insert on public.global_chat_messages to authenticated;
grant usage, select on sequence public.global_chat_messages_id_seq to authenticated;

create or replace function public.trim_global_chat_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.global_chat_messages
  where id in (
    select id
    from public.global_chat_messages
    order by created_at desc, id desc
    offset 50
  );
  return null;
end;
$$;

drop trigger if exists trg_trim_global_chat_messages on public.global_chat_messages;
create trigger trg_trim_global_chat_messages
after insert on public.global_chat_messages
for each statement
execute function public.trim_global_chat_messages();

-- Realtime: agregar tabla a la publicacion de Supabase
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
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;
-- RPC para premiar la temporada de Ranked
CREATE OR REPLACE FUNCTION public.fn_award_ranked_season_automated(target_season_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    winners_json JSONB;
    p_rec RECORD;
    rank_num INT := 0;
    award_count INT := 0;
BEGIN
    -- 1. Obtener el Top 50 de jugadores por ELO
    -- Solo incluimos jugadores que tengan al menos 1000 de ELO (el inicial)
    WITH ranked_players AS (
        SELECT 
            id as player_id, username as player_name, email as player_email, elo_rating
        FROM public.profiles
        WHERE elo_rating >= 1000
        ORDER BY elo_rating DESC, id ASC
        LIMIT 50
    )
    SELECT jsonb_agg(jsonb_build_object(
        'player_id', player_id,
        'player_name', player_name,
        'player_email', player_email,
        'elo', elo_rating
    )) INTO winners_json
    FROM ranked_players;

    IF winners_json IS NULL OR jsonb_array_length(winners_json) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No hay jugadores elegibles para premios.');
    END IF;

    -- 2. Distribuir Premios en la tabla 'awards'
    FOR i IN 0..jsonb_array_length(winners_json)-1 LOOP
        rank_num := i + 1;
        DECLARE
            w JSONB := winners_json->i;
            p_id UUID := (w->>'player_id')::uuid;
            p_name TEXT := w->>'player_name';
            p_email TEXT := w->>'player_email';
            prize_item JSONB;
        BEGIN
            -- TOP 1-10: Eevee shiny perfecto + 2 Ticket Cueva Celeste + 2 Ticket Islas Espumas
            IF rank_num <= 10 THEN
                -- Premio 1: Eevee Shiny Perfecto
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES ('ranked_season_' || target_season_name, p_id, p_name, p_email, 
                       '{"type": "pokemon", "species": "eevee", "level": 5, "shiny": true, "ivs": {"hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31}}'::jsonb, 
                       NOW());
                
                -- Premio 2: 2x Ticket Cueva Celeste
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES ('ranked_season_' || target_season_name, p_id, p_name, p_email, 
                       '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 2}'::jsonb, 
                       NOW());

                -- Premio 3: 2x Ticket Islas Espumas
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES ('ranked_season_' || target_season_name, p_id, p_name, p_email, 
                       '{"type": "item", "item": "Ticket Islas Espumas", "qty": 2}'::jsonb, 
                       NOW());
                
                award_count := award_count + 3;

            -- TOP 11-50: 2 Ticket Cueva Celeste + 2 Ticket Islas Espumas
            ELSIF rank_num <= 50 THEN
                -- Premio 1: 2x Ticket Cueva Celeste
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES ('ranked_season_' || target_season_name, p_id, p_name, p_email, 
                       '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 2}'::jsonb, 
                       NOW());

                -- Premio 2: 2x Ticket Islas Espumas
                INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                VALUES ('ranked_season_' || target_season_name, p_id, p_name, p_email, 
                       '{"type": "item", "item": "Ticket Islas Espumas", "qty": 2}'::jsonb, 
                       NOW());

                award_count := award_count + 2;
            END IF;
        END;
    END LOOP;

    -- 3. Registrar el resultado en competition_results
    INSERT INTO public.competition_results (event_id, winners, ended_at)
    VALUES ('ranked_season_' || target_season_name, winners_json, NOW());

    RETURN jsonb_build_object('ok', true, 'awarded_count', award_count, 'players_count', jsonb_array_length(winners_json));
END;
$$;
-- Ranked Rules: configuración de temporada
CREATE TABLE IF NOT EXISTS public.ranked_rules_config (
    id TEXT PRIMARY KEY,
    season_name TEXT NOT NULL DEFAULT 'TEMPORADA ACTUAL',
    config JSONB NOT NULL DEFAULT '{"maxPokemon":6,"levelCap":100,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ranked_rules_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ranked rules" ON public.ranked_rules_config;
CREATE POLICY "Public read ranked rules"
ON public.ranked_rules_config
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin write ranked rules" ON public.ranked_rules_config;
CREATE POLICY "Admin write ranked rules"
ON public.ranked_rules_config
FOR ALL
USING (auth.jwt()->>'email' = 'kodrol77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');

INSERT INTO public.ranked_rules_config (id, season_name, config)
VALUES (
  'current',
  'TEMPORADA ACTUAL',
  '{"maxPokemon":6,"levelCap":100,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
-- 4. Table for Competition Results (Podium / History)
CREATE TABLE IF NOT EXISTS public.competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES public.events_config(id),
    winners JSONB NOT NULL, -- Array of {rank, player_name, score, player_id}
    ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Competition Results
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read results" ON public.competition_results;
CREATE POLICY "Public read results" ON public.competition_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write results" ON public.competition_results;
CREATE POLICY "Admin write results" ON public.competition_results FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
DROP POLICY IF EXISTS "Admin update results" ON public.competition_results;
CREATE POLICY "Admin update results" ON public.competition_results FOR UPDATE USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- Update the RLS for Awards to be more robust (optional but recommended)
DROP POLICY IF EXISTS "Admin create awards" ON public.awards;
CREATE POLICY "Admin create awards" ON public.awards FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
-- Security Triggers for Poké Vicio
-- This script adds basic sanity checks to the game_saves table.

-- Function to validate the integrity of save_data
CREATE OR REPLACE FUNCTION validate_game_save()
RETURNS TRIGGER AS $$
DECLARE
  v_money BIGINT;
  v_bc BIGINT;
  v_team JSONB;
  v_box JSONB;
  v_poke JSONB;
BEGIN
  -- 1. Check Money Limits
  v_money := (NEW.save_data->>'money')::BIGINT;
  IF v_money > 99999999 THEN
    RAISE EXCEPTION 'Monto de dinero inválido (máx 99,999,999).';
  END IF;

  -- 2. Check Battle Coins Limits
  v_bc := (NEW.save_data->>'battleCoins')::BIGINT;
  IF v_bc > 1000000 THEN
    RAISE EXCEPTION 'Monto de Battle Coins inválido (máx 1,000,000).';
  END IF;

  -- 3. Check Pokémon Levels (Team)
  v_team := NEW.save_data->'team';
  IF v_team IS NOT NULL AND jsonb_array_length(v_team) > 0 THEN
    FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team)
    LOOP
      IF (v_poke->>'level')::INT > 100 THEN
        RAISE EXCEPTION 'Nivel de Pokémon inválido en el equipo (máx 100).';
      END IF;
    END LOOP;
  END IF;

  -- 4. Check Pokémon Levels (Box)
  v_box := NEW.save_data->'box';
  IF v_box IS NOT NULL AND jsonb_array_length(v_box) > 0 THEN
    FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box)
    LOOP
      IF (v_poke->>'level')::INT > 100 THEN
        RAISE EXCEPTION 'Nivel de Pokémon inválido en la caja (máx 100).';
      END IF;
    END LOOP;
  END IF;

  -- Update timestamp automatically if not provided
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_game_save ON game_saves;
CREATE TRIGGER trg_validate_game_save
BEFORE INSERT OR UPDATE ON game_saves
FOR EACH ROW
EXECUTE FUNCTION validate_game_save();
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
-- Supabase SQL Script to refactor execute_trade
-- This version performs all the logic on the server to prevent client-side manipulation.

CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
  v_sender_save JSONB;
  v_receiver_save JSONB;
  v_sender_id UUID;
  v_new_sender_save JSONB;
  v_new_receiver_save JSONB;
  v_p_uid TEXT;
  v_p_exists BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  
  -- 1. Fetch and Lock the trade offer
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta de intercambio.';
  END IF;
  
  IF v_trade.status != 'pending' THEN
    RAISE EXCEPTION 'El intercambio ya fue procesado o cancelado.';
  END IF;
  
  IF v_trade.receiver_id != v_caller_id THEN
    RAISE EXCEPTION 'No estás autorizado para aceptar este intercambio.';
  END IF;

  v_sender_id := v_trade.sender_id;

  -- 2. Fetch current saves
  SELECT save_data INTO v_sender_save FROM game_saves WHERE user_id = v_sender_id FOR UPDATE;
  SELECT save_data INTO v_receiver_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;

  IF v_sender_save IS NULL OR v_receiver_save IS NULL THEN
    RAISE EXCEPTION 'No se encontraron las partidas guardadas de los jugadores.';
  END IF;

  -- 3. VALIDATE AND REMOVE FROM SENDER
  v_new_sender_save := v_sender_save;

  -- Removing Pokémon offered by sender
  IF v_trade.offer_pokemon IS NOT NULL THEN
    v_p_uid := v_trade.offer_pokemon->>'uid';
    
    -- Try removing from sender's team
    v_new_sender_save := jsonb_set(
      v_new_sender_save, 
      '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_sender_save->'team') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
    );
    
    -- If team didn't change (length same), try removing from box
    IF jsonb_array_length(v_new_sender_save->'team') = jsonb_array_length(v_sender_save->'team') THEN
      v_new_sender_save := jsonb_set(
        v_new_sender_save, 
        '{box}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_sender_save->'box') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
      );
      IF jsonb_array_length(v_new_sender_save->'box') = jsonb_array_length(v_sender_save->'box') THEN
        RAISE EXCEPTION 'El remitente ya no tiene el Pokémon ofrecido.';
      END IF;
    END IF;
  END IF;

  -- Items & Money (Sender)
  IF (v_new_sender_save->>'money')::BIGINT < (v_trade.offer_money)::BIGINT THEN
    RAISE EXCEPTION 'El remitente no tiene suficiente dinero.';
  END IF;
  v_new_sender_save := jsonb_set(v_new_sender_save, '{money}', to_jsonb((v_new_sender_save->>'money')::BIGINT - (v_trade.offer_money)::BIGINT));

  -- TODO: Item validation (loop through offer_items keys)
  -- For now we trust the client's original offer structure but we *could* add more here.

  -- 4. VALIDATE AND REMOVE FROM RECEIVER (The Caller)
  v_new_receiver_save := v_receiver_save;

  IF v_trade.request_pokemon IS NOT NULL THEN
    v_p_uid := v_trade.request_pokemon->>'uid';
    v_new_receiver_save := jsonb_set(
      v_new_receiver_save, 
      '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_receiver_save->'team') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
    );
    IF jsonb_array_length(v_new_receiver_save->'team') = jsonb_array_length(v_receiver_save->'team') THEN
      RAISE EXCEPTION 'No tenés el Pokémon solicitado en tu equipo activo.';
    END IF;
  END IF;

  IF (v_new_receiver_save->>'money')::BIGINT < (v_trade.request_money)::BIGINT THEN
    RAISE EXCEPTION 'No tenés suficiente dinero para completar este intercambio.';
  END IF;
  v_new_receiver_save := jsonb_set(v_new_receiver_save, '{money}', to_jsonb((v_new_receiver_save->>'money')::BIGINT - (v_trade.request_money)::BIGINT));


  -- 5. ADD TO EACH OTHER
  -- Add sender's Pokémon to receiver
  IF v_trade.offer_pokemon IS NOT NULL THEN
    v_new_receiver_save := jsonb_set(v_new_receiver_save, '{team}', (v_new_receiver_save->'team') || jsonb_build_array(v_trade.offer_pokemon));
  END IF;
  v_new_receiver_save := jsonb_set(v_new_receiver_save, '{money}', to_jsonb((v_new_receiver_save->>'money')::BIGINT + COALESCE(v_trade.offer_money, 0)));

  -- Add receiver's Pokémon to sender
  IF v_trade.request_pokemon IS NOT NULL THEN
    v_new_sender_save := jsonb_set(v_new_sender_save, '{team}', (v_new_sender_save->'team') || jsonb_build_array(v_trade.request_pokemon));
  END IF;
  v_new_sender_save := jsonb_set(v_new_sender_save, '{money}', to_jsonb((v_new_sender_save->>'money')::BIGINT + COALESCE(v_trade.request_money, 0)));

  -- 6. Apply final updates
  UPDATE game_saves SET save_data = v_new_sender_save, updated_at = NOW() WHERE user_id = v_sender_id;
  UPDATE game_saves SET save_data = v_new_receiver_save, updated_at = NOW() WHERE user_id = v_caller_id;
  UPDATE trade_offers SET status = 'accepted', updated_at = NOW() WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Crear tabla de Eventos
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    type TEXT,
    active BOOLEAN DEFAULT false,
    manual BOOLEAN DEFAULT false,
    schedule JSONB,
    config JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar eventos por defecto
INSERT INTO events (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', false, false, '{"type": "weekly", "days": [6, 0]}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', false, false, '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "prize": null}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!')
ON CONFLICT (id) DO NOTHING;

-- Crear tabla de Entradas de Competición
CREATE TABLE IF NOT EXISTS competition_entries (
    id TEXT PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_id TEXT REFERENCES events(id),
    player_email TEXT NOT NULL,
    player_name TEXT,
    data JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de Premios (Awards)
CREATE TABLE IF NOT EXISTS awards (
    id TEXT PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_id TEXT REFERENCES events(id),
    winner_email TEXT NOT NULL,
    winner_name TEXT,
    prize JSONB,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMPTZ
);
