-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: CORRECCIÓN DE ESPECIES EN HUEVOS (PostgreSQL)
-- Fecha: 2026-08-30
-- Descripción: Repara los IDs de especies en "eggs" que fueron erróneamente prefijados con 'egg_'
--              o quedaron como identificadores opacos, restaurando el PokemonSpeciesId canónico.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_eggs JSONB;
  v_egg JSONB;
  v_new_eggs JSONB;
  v_egg_species TEXT;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL THEN
      CONTINUE;
    END IF;

    -- Desempaquetar saves almacenados como JSON string dentro de JSONB
    IF jsonb_typeof(v_save_data) = 'string' THEN
      BEGIN
        v_save_data := (v_save_data #>> '{}')::jsonb;
      EXCEPTION WHEN OTHERS THEN
        CONTINUE;
      END;
    END IF;

    IF jsonb_typeof(v_save_data) != 'object' THEN
      CONTINUE;
    END IF;

    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_egg IS NOT NULL AND jsonb_typeof(v_egg) = 'object' THEN
          IF v_egg -> 'id' IS NULL OR jsonb_typeof(v_egg -> 'id') = 'null' OR jsonb_typeof(v_egg -> 'id') = 'number' OR (v_egg ->> 'id') LIKE 'egg_%' THEN
            v_egg_species := COALESCE(
              NULLIF(v_egg ->> 'pokemonId', ''),
              NULLIF(v_egg ->> 'species', ''),
              CASE
                WHEN (v_egg ->> 'uid') LIKE '%-%' AND split_part(v_egg ->> 'uid', '-', 1) NOT LIKE 'egg%' THEN split_part(v_egg ->> 'uid', '-', 1)
                ELSE NULL
              END,
              'togepi'
            );
            IF v_egg_species LIKE 'egg_%' OR v_egg_species = 'test_egg_uid' OR v_egg_species = 'egg' THEN
              v_egg_species := 'togepi';
            END IF;
            v_egg := jsonb_set(v_egg, '{id}', to_jsonb(v_egg_species));
          END IF;
          v_new_eggs := v_new_eggs || v_egg;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
      UPDATE public.game_saves SET save_data = v_save_data, last_save_id = gen_random_uuid() WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830200000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

UPDATE public.game_saves SET last_save_id = gen_random_uuid();
