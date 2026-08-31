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
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', true, false, '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('dia_pesca', 'Día de Pesca', '🎣', 'passive_bonus', true, false, '{"type": "weekly", "days": [2], "startHour": 0, "endHour": 23.99}', '{"fishingMult": 2}', 'Muchas más posibilidades de encuentros de pesca en mapas con agua'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', true, false, '{"type": "weekly", "days": [2, 4], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "hasCompetition": true, "requireCaughtDuringEvent": true, "speciesShinyMult": 3, "speciesRateMult": 2, "fishingMult": 2, "minigameBuffs": {"fishing": {"encounterRateMult": 2, "rareDropMult": 1.5, "shinyMult": 3}}, "subCompetitions": [{"id": "ivs", "name": "Genética Superior (IVs)", "metric": "total_ivs", "order": "max", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"goldbottlecap": 1, "rarecandy": 5}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bottlecap": 2, "rarecandy": 3}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"bottlecap": 1, "rarecandy": 1}}}}, {"id": "weight", "name": "Masa y Peso (Titán / Miniatura)", "metric": "weight", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"bigpearl": 3, "lureball": 10}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bigpearl": 2, "netball": 10}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"pearl": 3, "diveball": 5}}}}, {"id": "height", "name": "Envergadura y Altura (Gran Salto)", "metric": "height", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"waterstone": 2, "dragonscale": 1, "mysticwater": 1}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"waterstone": 1, "damprock": 1}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"waterstone": 1}}}}]}', '¡Capturá el Magikarp con mejores cualidades y ganá premios temáticos en cada sub-competencia!')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  type = EXCLUDED.type,
  schedule = EXCLUDED.schedule,
  config = EXCLUDED.config,
  description = EXCLUDED.description;

-- 2. Table for Competition Entries
CREATE TABLE IF NOT EXISTS public.competition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES public.events_config(id),
    category_id TEXT NOT NULL DEFAULT 'ivs',
    player_id UUID REFERENCES auth.users(id),
    player_name TEXT NOT NULL,
    player_email TEXT NOT NULL,
    pokemon_uid TEXT,
    data JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, category_id, player_id)
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
    claimed_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ
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
    winners JSONB NOT NULL, -- Array of {rank, player_name, score, player_id, category_id}
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
    all_winners_json JSONB := '[]'::jsonb;
    sub_comps JSONB;
    sub_prizes JSONB;
    sub_winners JSONB;
    cat_rec RECORD;
    matching_sub JSONB;
    sub_order TEXT;
    sub_name TEXT;
    i INT;
    j INT;
    w JSONB;
    p JSONB;
BEGIN
    -- 1. Get event config and check locks
    SELECT * INTO event_rec FROM public.events_config WHERE id = target_event_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No se encontró el evento.'); END IF;

    -- Avoid awarding if it has no competition
    IF (event_rec.config->>'hasCompetition')::boolean IS FALSE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Evento sin competencia.');
    END IF;

    -- Lock to avoid double awarding (< 10 min window or same run)
    IF event_rec.last_awarded_at IS NOT NULL AND (NOW() - event_rec.last_awarded_at < INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Ya premiado recientemente.');
    END IF;

    sub_comps := event_rec.config->'subCompetitions';

    -- Query all distinct categories present in competition_entries for this event
    FOR cat_rec IN 
        SELECT DISTINCT COALESCE(category_id, 'ivs') AS cat_id 
        FROM public.competition_entries 
        WHERE event_id = target_event_id
    LOOP
        -- Find matching sub_competition config from event_rec.config
        matching_sub := NULL;
        IF sub_comps IS NOT NULL AND jsonb_array_length(sub_comps) > 0 THEN
            FOR i IN 0..jsonb_array_length(sub_comps)-1 LOOP
                IF (sub_comps->i->>'id') = cat_rec.cat_id OR cat_rec.cat_id LIKE (sub_comps->i->>'id') || '_%' THEN
                    matching_sub := sub_comps->i;
                    EXIT;
                END IF;
            END LOOP;
        END IF;

        sub_order := COALESCE(matching_sub->>'order', 'max');
        sub_name := COALESCE(matching_sub->>'name', cat_rec.cat_id);
        sub_prizes := COALESCE(matching_sub->'prizes', event_rec.config->'prizes');

        WITH ranked_entries AS (
            SELECT 
                player_id, player_name, player_email, data,
                ROW_NUMBER() OVER (
                    ORDER BY 
                        (CASE WHEN sub_order = 'min' 
                              THEN (COALESCE(data->>'score', data->>'total_ivs', '0'))::numeric 
                              ELSE -(COALESCE(data->>'score', data->>'total_ivs', '0'))::numeric 
                         END) ASC,
                        (CASE WHEN (COALESCE(data->>'is_shiny', 'false'))::boolean = true THEN 1 ELSE 0 END) DESC,
                        (COALESCE((data->>'obtained_at')::bigint, 9223372036854775807)) ASC,
                        submitted_at ASC
                ) as rank_num
            FROM public.competition_entries
            WHERE event_id = target_event_id AND (category_id = cat_rec.cat_id OR (cat_rec.cat_id = 'ivs' AND category_id IS NULL))
            LIMIT 3
        )
        SELECT jsonb_agg(jsonb_build_object(
            'rank', CASE rank_num WHEN 1 THEN 'first' WHEN 2 THEN 'second' WHEN 3 THEN 'third' END,
            'category_id', cat_rec.cat_id,
            'category_name', sub_name,
            'player_id', player_id,
            'player_name', player_name,
            'score', (COALESCE(data->>'score', data->>'total_ivs', '0'))::numeric,
            'entry_data', data
        )) INTO sub_winners
        FROM ranked_entries;

        IF sub_winners IS NOT NULL AND jsonb_array_length(sub_winners) > 0 THEN
            all_winners_json := all_winners_json || sub_winners;

            -- Distribute prizes for this sub-competition
            IF sub_prizes IS NOT NULL THEN
                FOR j IN 0..jsonb_array_length(sub_winners)-1 LOOP
                    w := sub_winners->j;
                    p := sub_prizes->(w->>'rank');
                    IF p IS NOT NULL THEN
                        INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
                        VALUES (target_event_id, (w->>'player_id')::uuid, w->>'player_name', 
                               (SELECT player_email FROM competition_entries WHERE player_id = (w->>'player_id')::uuid AND event_id = target_event_id AND category_id = cat_rec.cat_id LIMIT 1),
                               p, NOW());
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    -- If no winners found, lock and return
    IF all_winners_json = '[]'::jsonb THEN
        UPDATE public.events_config SET last_awarded_at = NOW() WHERE id = target_event_id;
        RETURN jsonb_build_object('ok', false, 'error', 'Sin participantes.');
    END IF;

    -- Record competition result
    INSERT INTO public.competition_results (event_id, winners, ended_at)
    VALUES (target_event_id, all_winners_json, NOW());

    -- Prune older results
    DELETE FROM public.competition_results
    WHERE id NOT IN (
        SELECT id FROM public.competition_results
        ORDER BY ended_at DESC
        LIMIT 100
    );

    -- Update events_config and clean up competition entries
    UPDATE public.events_config SET last_awarded_at = NOW() WHERE id = target_event_id;
    DELETE FROM public.competition_entries WHERE event_id = target_event_id;

    RETURN jsonb_build_object('ok', true, 'success', true, 'winners', all_winners_json);
END;
$$;
