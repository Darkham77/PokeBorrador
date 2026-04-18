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
