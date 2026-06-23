-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE HUEVOS Y MISIONES EN SAVES
-- Fecha: 2026-06-22
-- Descripción: Migra los saves de la base de datos PostgreSQL (Supabase) eliminando guiones de especies en "eggs" y "daycare_missions".
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_eggs JSONB;
  v_new_eggs JSONB;
  v_egg JSONB;
  v_egg_id TEXT;
  v_egg_pokemon_id TEXT;
  v_egg_uid TEXT;
  v_missions JSONB;
  v_new_missions JSONB;
  v_mission JSONB;
  v_mission_target TEXT;
  v_species_map JSONB;
  v_key TEXT;
  v_new_uid TEXT;
BEGIN
  -- Mappings para corregir los IDs con guiones bajos remanentes
  v_species_map := '{
    "nidoran_f": "nidoranf",
    "nidoran_m": "nidoranm",
    "mr_mime": "mrmime",
    "ho_oh": "hooh",
    "ho-oh": "hooh"
  }'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_eggs := v_save_data -> 'eggs';
    v_missions := v_save_data -> 'daycare_missions';

    -- A. Process Eggs
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        -- 1. Correct id
        v_egg_id := v_egg ->> 'id';
        IF v_egg_id IS NOT NULL THEN
          v_key := lower(v_egg_id);
          IF v_species_map ->> v_key IS NOT NULL THEN
            v_egg := jsonb_set(v_egg, '{id}', to_jsonb(v_species_map ->> v_key));
          END IF;
        END IF;

        -- 2. Correct pokemonId
        v_egg_pokemon_id := v_egg ->> 'pokemonId';
        IF v_egg_pokemon_id IS NOT NULL THEN
          v_key := lower(v_egg_pokemon_id);
          IF v_species_map ->> v_key IS NOT NULL THEN
            v_egg := jsonb_set(v_egg, '{pokemonId}', to_jsonb(v_species_map ->> v_key));
          END IF;
        END IF;

        -- 3. Correct uid (e.g. nidoran_f-timestamp)
        v_egg_uid := v_egg ->> 'uid';
        IF v_egg_uid IS NOT NULL THEN
          v_new_uid := v_egg_uid;
          IF v_egg_uid LIKE 'nidoran_f-%' THEN
            v_new_uid := regexp_replace(v_egg_uid, '^nidoran_f-', 'nidoranf-');
          ELSIF v_egg_uid LIKE 'nidoran_m-%' THEN
            v_new_uid := regexp_replace(v_egg_uid, '^nidoran_m-', 'nidoranm-');
          ELSIF v_egg_uid LIKE 'mr_mime-%' THEN
            v_new_uid := regexp_replace(v_egg_uid, '^mr_mime-', 'mrmime-');
          ELSIF v_egg_uid LIKE 'ho_oh-%' THEN
            v_new_uid := regexp_replace(v_egg_uid, '^ho_oh-', 'hooh-');
          ELSIF v_egg_uid LIKE 'ho-oh-%' THEN
            v_new_uid := regexp_replace(v_egg_uid, '^ho-oh-', 'hooh-');
          END IF;
          
          IF v_new_uid <> v_egg_uid THEN
            v_egg := jsonb_set(v_egg, '{uid}', to_jsonb(v_new_uid));
          END IF;
        END IF;

        v_new_eggs := v_new_eggs || v_egg;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
    END IF;

    -- B. Process Daycare Missions
    IF v_missions IS NOT NULL AND jsonb_typeof(v_missions) = 'array' THEN
      v_new_missions := '[]'::jsonb;
      FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions) LOOP
        v_mission_target := v_mission ->> 'targetId';
        IF v_mission_target IS NOT NULL THEN
          v_key := lower(v_mission_target);
          IF v_species_map ->> v_key IS NOT NULL THEN
            v_mission := jsonb_set(v_mission, '{targetId}', to_jsonb(v_species_map ->> v_key));
          END IF;
        END IF;
        v_new_missions := v_new_missions || v_mission;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{daycare_missions}', v_new_missions);
    END IF;

    -- Write back to PostgreSQL
    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  -- 2. Actualizar db_version
  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260622000300'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
