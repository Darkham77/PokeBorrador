-- Migration: 20260906000000_create_fn_award_ranked_season_automated.sql
-- Description: Automated ranked season awarding procedure with tier-based rewards, soft reset, and passive battle report recording.

-- 1. Ensure ranked_rules_config table exists with proper structure
CREATE TABLE IF NOT EXISTS public.ranked_rules_config (
    id TEXT PRIMARY KEY,
    season_name TEXT DEFAULT 'TEMPORADA ACTUAL',
    config JSONB DEFAULT '{}'::jsonb,
    last_awarded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ranked_rules_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read ranked_rules_config" ON public.ranked_rules_config;
CREATE POLICY "Public read ranked_rules_config" ON public.ranked_rules_config FOR SELECT USING (true);
GRANT SELECT ON public.ranked_rules_config TO anon, authenticated, service_role;

-- 2. Stored Procedure for Automated Ranked Season Awarding & Soft Reset
CREATE OR REPLACE FUNCTION public.fn_award_ranked_season_automated(target_season_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_rules RECORD;
    v_eligible_count INT := 0;
    v_awards_count INT := 0;
    v_player RECORD;
    v_rank INT := 0;
    v_tier TEXT;
    v_podium JSONB := '[]'::jsonb;
    v_event_id TEXT;
BEGIN
    v_event_id := 'ranked_season_' || COALESCE(NULLIF(target_season_name, ''), 'actual');

    -- Check last_awarded_at to prevent duplicate executions (10-minute lockout)
    SELECT * INTO v_rules FROM public.ranked_rules_config WHERE id = 'current';
    IF FOUND AND v_rules.last_awarded_at IS NOT NULL AND (NOW() - v_rules.last_awarded_at < INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Ya premiado recientemente.');
    END IF;

    -- Iterate through players with at least 5 matches and ELO >= 1000
    FOR v_player IN
        SELECT 
            id,
            username,
            COALESCE(email, '') as email,
            COALESCE(elo_rating, 1000) as elo,
            COALESCE(pvp_wins, 0) as wins,
            COALESCE(pvp_losses, 0) as losses,
            COALESCE(pvp_draws, 0) as draws
        FROM public.profiles
        WHERE (COALESCE(pvp_wins, 0) + COALESCE(pvp_losses, 0) + COALESCE(pvp_draws, 0)) >= 5
          AND COALESCE(elo_rating, 1000) >= 1000
        ORDER BY elo_rating DESC, id ASC
    LOOP
        v_rank := v_rank + 1;
        v_eligible_count := v_eligible_count + 1;

        -- Determine Tier based on ELO
        IF v_player.elo >= 3400 THEN
            v_tier := 'maestro';
        ELSIF v_player.elo >= 2700 THEN
            v_tier := 'diamante';
        ELSIF v_player.elo >= 2100 THEN
            v_tier := 'platino';
        ELSIF v_player.elo >= 1600 THEN
            v_tier := 'oro';
        ELSIF v_player.elo >= 1200 THEN
            v_tier := 'plata';
        ELSE
            v_tier := 'bronce';
        END IF;

        -- Record Top 10 podium entries
        IF v_rank <= 10 THEN
            v_podium := v_podium || jsonb_build_object(
                'rank', v_rank,
                'tier', v_tier,
                'player_id', v_player.id,
                'player_name', v_player.username,
                'player_email', v_player.email,
                'elo', v_player.elo
            );
        END IF;

        -- Distribute Tier Prizes into public.awards
        -- 1. Seasonal Achievement Medal (for player profile showcase)
        INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
        VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                jsonb_build_object('type', 'ranked_medal', 'tier', v_tier, 'season', COALESCE(NULLIF(target_season_name, ''), 'TEMPORADA ACTUAL'), 'rank', v_rank, 'elo', v_player.elo),
                NOW());
        v_awards_count := v_awards_count + 1;

        -- Maestro (3400+): Eevee Shiny 6 IVs 31 + Tickets + 500 BC
        IF v_tier = 'maestro' THEN
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "pokemon", "species": "eevee", "level": 50, "shiny": true, "ivs": {"hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31}}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 3}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Islas Espumas", "qty": 3}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 500, "battleCoins": 500}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 4;

        -- Diamante (2700 - 3399): Eevee 5 IVs 31 + Tickets + 350 BC
        ELSIF v_tier = 'diamante' THEN
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "pokemon", "species": "eevee", "level": 50, "shiny": false, "ivs": {"hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 28}}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 2}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Islas Espumas", "qty": 2}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 350, "battleCoins": 350}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 4;

        -- Platino (2100 - 2699): 2x Tickets + 250 BC
        ELSIF v_tier = 'platino' THEN
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 2}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Islas Espumas", "qty": 2}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 250, "battleCoins": 250}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 3;

        -- Oro (1600 - 2099): 1x Tickets + 150 BC
        ELSIF v_tier = 'oro' THEN
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 1}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Islas Espumas", "qty": 1}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 150, "battleCoins": 150}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 3;

        -- Plata (1200 - 1599): 1x Ticket Cueva Celeste + 75 BC
        ELSIF v_tier = 'plata' THEN
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "item", "item": "Ticket Cueva Celeste", "qty": 1}'::jsonb,
                    NOW());
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 75, "battleCoins": 75}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 2;

        -- Bronce (1000 - 1199): 25 BC
        ELSE
            INSERT INTO public.awards (event_id, winner_id, winner_name, winner_email, prize, awarded_at)
            VALUES (v_event_id, v_player.id, v_player.username, v_player.email,
                    '{"type": "bc", "amount": 25, "battleCoins": 25}'::jsonb,
                    NOW());
            v_awards_count := v_awards_count + 1;
        END IF;
    END LOOP;

    -- Save podium to competition_results
    IF jsonb_array_length(v_podium) > 0 THEN
        INSERT INTO public.competition_results (event_id, winners, ended_at)
        VALUES (v_event_id, v_podium, NOW());
    END IF;

    -- Apply proportional ELO Soft Reset to all profiles: (elo - 1000)/2 + 1000
    UPDATE public.profiles
    SET elo_rating = GREATEST(1000, 1000 + ((COALESCE(elo_rating, 1000) - 1000) / 2));

    -- Update ranked_rules_config with execution timestamp
    INSERT INTO public.ranked_rules_config (id, season_name, last_awarded_at, updated_at)
    VALUES ('current', target_season_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        last_awarded_at = NOW(),
        updated_at = NOW();

    RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'event_id', v_event_id,
        'eligible_players', v_eligible_count,
        'awards_created', v_awards_count,
        'podium_count', jsonb_array_length(v_podium)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_award_ranked_season_automated(TEXT) TO authenticated, anon, service_role;

-- 3. Stored Procedure to Record Passive / Offline Battle Results
CREATE OR REPLACE FUNCTION public.record_passive_battle_result(
    p_defender_id UUID,
    p_result TEXT,
    p_delta_elo INT,
    p_report_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
    END IF;

    -- Insert into passive_battle_reports
    INSERT INTO public.passive_battle_reports (user_id, opponent_id, result, report_data, created_at)
    VALUES (p_defender_id, v_caller_id, p_result, p_report_data, NOW());

    -- Update defender's ELO with safe floor at 1000
    UPDATE public.profiles
    SET elo_rating = GREATEST(1000, COALESCE(elo_rating, 1000) + p_delta_elo)
    WHERE id = p_defender_id;

    RETURN jsonb_build_object('ok', true, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_passive_battle_result(UUID, TEXT, INT, JSONB) TO authenticated, service_role;

-- 4. Monotonic DB version record
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260906000000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
