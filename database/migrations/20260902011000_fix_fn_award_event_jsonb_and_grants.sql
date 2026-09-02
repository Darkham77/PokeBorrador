-- PostgreSQL Migration: 20260902011000_fix_fn_award_event_jsonb_and_grants.sql
-- Description: Forward migration to convert text columns to JSONB, install fixed fn_award_event_automated with grants, and provide claim_award RPC.

-- 1. Ensure columns are safely converted to JSONB if they were created as TEXT in older migrations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events_config' AND column_name = 'config' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.events_config ALTER COLUMN config TYPE JSONB USING config::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events_config' AND column_name = 'schedule' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.events_config ALTER COLUMN schedule TYPE JSONB USING schedule::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'competition_entries' AND column_name = 'data' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.competition_entries ALTER COLUMN data TYPE JSONB USING data::jsonb;
  END IF;
END $$;

-- 2. Stored Procedure with full type-safety for text or jsonb columns
CREATE OR REPLACE FUNCTION public.fn_award_event_automated(target_event_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    event_rec RECORD;
    v_config JSONB;
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

    -- Safely coerce config into JSONB
    v_config := (event_rec.config)::jsonb;

    -- Avoid awarding if it has no competition
    IF (v_config->>'hasCompetition')::boolean IS FALSE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Evento sin competencia.');
    END IF;

    -- Lock to avoid double awarding (< 10 min window or same run)
    IF NULLIF(event_rec.last_awarded_at::text, '') IS NOT NULL AND (NOW() - (event_rec.last_awarded_at)::timestamptz < INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Ya premiado recientemente.');
    END IF;

    sub_comps := v_config->'subCompetitions';

    -- Query all distinct categories present in competition_entries for this event
    FOR cat_rec IN 
        SELECT DISTINCT COALESCE(category_id, 'ivs') AS cat_id 
        FROM public.competition_entries 
        WHERE event_id = target_event_id
    LOOP
        -- Find matching sub_competition config from v_config
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
        sub_prizes := COALESCE(matching_sub->'prizes', v_config->'prizes');

        WITH ranked_entries AS (
            SELECT 
                player_id, player_name, player_email, (data)::jsonb AS entry_json,
                ROW_NUMBER() OVER (
                    ORDER BY 
                        (CASE WHEN sub_order = 'min' 
                              THEN (COALESCE((data)::jsonb->>'score', (data)::jsonb->>'total_ivs', '0'))::numeric 
                              ELSE -(COALESCE((data)::jsonb->>'score', (data)::jsonb->>'total_ivs', '0'))::numeric 
                         END) ASC,
                        (CASE WHEN (COALESCE((data)::jsonb->>'is_shiny', 'false'))::boolean = true THEN 1 ELSE 0 END) DESC,
                        (COALESCE(((data)::jsonb->>'obtained_at')::numeric, 9223372036854775807)) ASC,
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
            'player_email', COALESCE(player_email, ''),
            'score', (COALESCE(entry_json->>'score', entry_json->>'total_ivs', '0'))::numeric,
            'entry_data', entry_json
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
                        VALUES (
                            target_event_id, 
                            (CASE WHEN (w->>'player_id') ~ '^[0-9a-fA-F-]{36}$' THEN (w->>'player_id')::uuid ELSE NULL END), 
                            w->>'player_name', 
                            COALESCE(w->>'player_email', ''),
                            p, 
                            NOW()
                        );
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    -- If no winners found, lock and return
    IF all_winners_json = '[]'::jsonb THEN
        UPDATE public.events_config SET last_awarded_at = NOW()::text WHERE id = target_event_id;
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
    UPDATE public.events_config SET last_awarded_at = NOW()::text WHERE id = target_event_id;
    DELETE FROM public.competition_entries WHERE event_id = target_event_id;

    RETURN jsonb_build_object('ok', true, 'success', true, 'winners', all_winners_json);
END;
$$;

-- Grant permissions for automated awarding
GRANT EXECUTE ON FUNCTION public.fn_award_event_automated(TEXT) TO authenticated, anon, service_role;

-- 3. Claim Award RPC
CREATE OR REPLACE FUNCTION public.claim_award(p_award_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_award RECORD;
BEGIN
    SELECT * INTO v_award FROM public.awards WHERE id = p_award_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Recompensa no encontrada.');
    END IF;
    IF v_award.winner_id != auth.uid() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No autorizado.');
    END IF;
    UPDATE public.awards 
    SET claimed = true, claimed_at = NOW(), received_at = NOW() 
    WHERE id = p_award_id;
    RETURN jsonb_build_object('ok', true, 'success', true, 'prize', v_award.prize);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_award(UUID) TO authenticated, service_role;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260902011000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
