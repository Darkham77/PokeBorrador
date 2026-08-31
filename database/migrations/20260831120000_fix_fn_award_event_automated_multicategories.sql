-- Fix fn_award_event_automated to dynamically iterate and award all distinct category_id entries (e.g. weight_magikarp, height_magikarp)
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
