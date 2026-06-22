-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE MOVIMIENTOS EN SAVES A IDS DE SHOWDOWN
-- Fecha: 2026-06-22
-- Descripción: Limpia los guiones bajos de los IDs de movimientos en los saves de PostgreSQL (Supabase).
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save JSONB;
  v_team JSONB;
  v_box JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_poke JSONB;
  v_moves JSONB;
  v_new_moves JSONB;
  v_move JSONB;
  v_move_id TEXT;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save := r.save_data;
    v_team := v_save -> 'team';
    v_box := v_save -> 'box';

    -- A. Procesar Team
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_id := v_move ->> 'id';
            IF v_move_id IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(replace(v_move_id, '_', '')));
            END IF;
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save := jsonb_set(v_save, '{team}', v_new_team);
    END IF;

    -- B. Procesar Box
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_id := v_move ->> 'id';
            IF v_move_id IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(replace(v_move_id, '_', '')));
            END IF;
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save := jsonb_set(v_save, '{box}', v_new_box);
    END IF;

    -- Escribir de vuelta a la base de datos
    UPDATE public.game_saves 
    SET save_data = v_save 
    WHERE user_id = r.user_id;
  END LOOP;

  -- Actualizar db_version
  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260622000100'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
