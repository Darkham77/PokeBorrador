-- Migration: 20260907000000_create_battle_replays.sql
-- Description: Create battle_replays table, indices, RLS policies, and stored procedures for PvP Battle Replays & Theater.

CREATE TABLE IF NOT EXISTS public.battle_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_code TEXT UNIQUE NOT NULL,
    season_id TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    p1_user_id UUID,
    p2_user_id UUID,
    p1_data JSONB NOT NULL,
    p2_data JSONB NOT NULL,
    turns_count INT NOT NULL DEFAULT 0,
    winner_side TEXT NOT NULL,
    choice_stream JSONB NOT NULL DEFAULT '[]'::jsonb,
    initial_seed JSONB NOT NULL DEFAULT '[0,0,0,0]'::jsonb,
    is_top10_archived BOOLEAN NOT NULL DEFAULT FALSE,
    views_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.battle_replays ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if they exist
DROP POLICY IF EXISTS "Public read battle_replays" ON public.battle_replays;
DROP POLICY IF EXISTS "Authenticated insert battle_replays" ON public.battle_replays;
DROP POLICY IF EXISTS "Service role manage battle_replays" ON public.battle_replays;

-- Policies
CREATE POLICY "Public read battle_replays"
    ON public.battle_replays
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated insert battle_replays"
    ON public.battle_replays
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = p1_user_id OR auth.uid() = p2_user_id OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Service role manage battle_replays"
    ON public.battle_replays
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Permissions
GRANT SELECT, INSERT ON public.battle_replays TO anon, authenticated;
GRANT ALL ON public.battle_replays TO service_role;

-- Indices
CREATE INDEX IF NOT EXISTS idx_battle_replays_code ON public.battle_replays(battle_code);
CREATE INDEX IF NOT EXISTS idx_battle_replays_top10 ON public.battle_replays(is_top10_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_replays_p1 ON public.battle_replays(p1_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_replays_p2 ON public.battle_replays(p2_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_replays_created_at ON public.battle_replays(created_at DESC);

-- Stored Procedure: fn_publish_battle_replay
CREATE OR REPLACE FUNCTION public.fn_publish_battle_replay(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_battle_code TEXT;
    v_season_id TEXT;
    v_theme_id TEXT;
    v_p1_user_id UUID;
    v_p2_user_id UUID;
    v_p1_data JSONB;
    v_p2_data JSONB;
    v_turns_count INT;
    v_winner_side TEXT;
    v_choice_stream JSONB;
    v_initial_seed JSONB;
    v_is_top10 BOOLEAN := FALSE;
    v_inserted_id UUID;
    v_inserted_at TIMESTAMPTZ;
    v_top10_count INT;
BEGIN
    v_battle_code := COALESCE(payload->>'battleCode', payload->>'battle_code');
    IF v_battle_code IS NULL OR v_battle_code = '' THEN
        v_battle_code := 'BTL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 4));
    END IF;

    v_season_id := COALESCE(payload->>'seasonId', payload->>'season_id', 'TEMPORADA ACTUAL');
    v_theme_id := COALESCE(payload->>'themeId', payload->>'theme_id', 'masters_allstars');
    
    IF payload->>'p1_user_id' IS NOT NULL AND payload->>'p1_user_id' != '' THEN
        v_p1_user_id := (payload->>'p1_user_id')::UUID;
    ELSIF payload->'p1'->>'userId' IS NOT NULL AND payload->'p1'->>'userId' != '' THEN
        BEGIN
            v_p1_user_id := (payload->'p1'->>'userId')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_p1_user_id := NULL;
        END;
    END IF;

    IF payload->>'p2_user_id' IS NOT NULL AND payload->>'p2_user_id' != '' THEN
        v_p2_user_id := (payload->>'p2_user_id')::UUID;
    ELSIF payload->'p2'->>'userId' IS NOT NULL AND payload->'p2'->>'userId' != '' THEN
        BEGIN
            v_p2_user_id := (payload->'p2'->>'userId')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_p2_user_id := NULL;
        END;
    END IF;

    v_p1_data := COALESCE(payload->'p1', payload->'p1_data', '{}'::jsonb);
    v_p2_data := COALESCE(payload->'p2', payload->'p2_data', '{}'::jsonb);
    v_turns_count := COALESCE((payload->>'turnsCount')::INT, (payload->>'turns_count')::INT, 0);
    v_winner_side := COALESCE(payload->>'winnerSide', payload->>'winner_side', 'p1');
    v_choice_stream := COALESCE(payload->'choiceStream', payload->'choice_stream', '[]'::jsonb);
    v_initial_seed := COALESCE(payload->'initialSeed', payload->'initial_seed', '[0,0,0,0]'::jsonb);

    -- Check if either participant is currently in the Top 10 leaderboard
    IF v_p1_user_id IS NOT NULL OR v_p2_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_top10_count
        FROM (
            SELECT id FROM public.profiles
            ORDER BY elo_rating DESC
            LIMIT 10
        ) t
        WHERE t.id IN (v_p1_user_id, v_p2_user_id);

        IF v_top10_count > 0 THEN
            v_is_top10 := TRUE;
        END IF;
    END IF;

    IF COALESCE((payload->>'isTop10Archived')::BOOLEAN, (payload->>'is_top10_archived')::BOOLEAN, FALSE) THEN
        v_is_top10 := TRUE;
    END IF;

    INSERT INTO public.battle_replays (
        battle_code,
        season_id,
        theme_id,
        p1_user_id,
        p2_user_id,
        p1_data,
        p2_data,
        turns_count,
        winner_side,
        choice_stream,
        initial_seed,
        is_top10_archived,
        created_at
    ) VALUES (
        v_battle_code,
        v_season_id,
        v_theme_id,
        v_p1_user_id,
        v_p2_user_id,
        v_p1_data,
        v_p2_data,
        v_turns_count,
        v_winner_side,
        v_choice_stream,
        v_initial_seed,
        v_is_top10,
        NOW()
    )
    ON CONFLICT (battle_code) DO UPDATE SET
        views_count = battle_replays.views_count + 1
    RETURNING id, created_at, battle_code, is_top10_archived INTO v_inserted_id, v_inserted_at, v_battle_code, v_is_top10;

    RETURN jsonb_build_object(
        'ok', true,
        'replayId', v_inserted_id,
        'battleCode', v_battle_code,
        'isTop10Archived', v_is_top10,
        'createdAt', v_inserted_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_publish_battle_replay(JSONB) TO anon, authenticated, service_role;

-- Stored Procedure: fn_get_featured_replays
CREATE OR REPLACE FUNCTION public.fn_get_featured_replays(p_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_result
    FROM (
        SELECT
            id,
            battle_code AS "battleCode",
            season_id AS "seasonId",
            theme_id AS "themeId",
            p1_data AS p1,
            p2_data AS p2,
            turns_count AS "turnsCount",
            winner_side AS "winnerSide",
            is_top10_archived AS "isTop10Archived",
            views_count AS "viewsCount",
            created_at AS "createdAt"
        FROM public.battle_replays
        ORDER BY is_top10_archived DESC, created_at DESC
        LIMIT LEAST(p_limit, 50)
    ) r;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_featured_replays(INT) TO anon, authenticated, service_role;

-- Update db_version
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '"20260907000000"')
ON CONFLICT (key) DO UPDATE
SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
