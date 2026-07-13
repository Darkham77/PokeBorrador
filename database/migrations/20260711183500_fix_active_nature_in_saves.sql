-- Migration: 20260711183500_fix_active_nature_in_saves
-- Description: Corrects invalid nature 'active' to Showdown-compliant 'hasty' in player saves.

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_poke JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_team := v_save_data -> 'team';
    v_box := v_save_data -> 'box';

    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF v_poke ->> 'nature' = 'active' THEN
          v_poke := jsonb_set(v_poke, '{nature}', '"hasty"'::jsonb);
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF v_poke ->> 'nature' = 'active' THEN
          v_poke := jsonb_set(v_poke, '{nature}', '"hasty"'::jsonb);
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
  END LOOP;
END $$;
