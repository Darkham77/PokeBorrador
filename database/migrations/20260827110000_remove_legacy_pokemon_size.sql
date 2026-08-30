-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: ELIMINACIÓN DE SIZE LEGACY (PostgreSQL)
-- Fecha: 2026-08-27
-- Descripción: Elimina la propiedad legacy 'size' de todos los Pokémon guardados
--              en team y box de game_saves, así como en competition_entries.
--              Las dimensiones físicas se modelan en tiempo real con height (m)
--              y weight (kg), sin almacenar size ni tiers estáticos.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_poke JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL OR jsonb_typeof(v_save_data) != 'object' THEN
      CONTINUE;
    END IF;

    -- 1. Eliminar 'size' en Team
    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          v_poke := v_poke - 'size';
          v_new_team := v_new_team || v_poke;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- 2. Eliminar 'size' en Box
    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          v_poke := v_poke - 'size';
          v_new_box := v_new_box || v_poke;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  -- 3. Eliminar 'size' de competition_entries.data
  UPDATE public.competition_entries
  SET data = (data::jsonb - 'size')
  WHERE data IS NOT NULL AND (data::jsonb ? 'size');

  INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260827110000'::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END $$;
