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
