-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: SANEAMIENTO Y REGENERACIÓN COMPLETA DE HUEVOS (PostgreSQL)
-- Fecha: 2026-08-30
-- Descripción: Audita, sanea y regenera campos inválidos en todos los huevos (incubadora 'eggs' y 'daycareWarehouse')
--              de todas las cuentas en 'game_saves', garantizando especies canónicas, naturalezas en inglés,
--              IVs válidos (0-31), steps y flags booleanos íntegros.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_nature_map JSONB := '{
    "firme": "adamant",
    "timido": "bashful",
    "timida": "bashful",
    "tímido": "bashful",
    "tímida": "bashful",
    "osado": "bold",
    "osada": "bold",
    "audaz": "brave",
    "sereno": "calm",
    "serena": "calm",
    "cauto": "careful",
    "cauta": "careful",
    "docil": "docile",
    "dócil": "docile",
    "amable": "gentle",
    "fuerte": "hardy",
    "activa": "hasty",
    "activo": "hasty",
    "agitada": "impish",
    "agitado": "impish",
    "alegre": "jolly",
    "floja": "lax",
    "flojo": "lax",
    "hurana": "lonely",
    "huraña": "lonely",
    "hurano": "lonely",
    "huraño": "lonely",
    "afable": "mild",
    "modesta": "modest",
    "modesto": "modest",
    "ingenua": "naive",
    "ingenuo": "naive",
    "picara": "naughty",
    "pícara": "naughty",
    "picaro": "naughty",
    "pícaro": "naughty",
    "mansa": "quiet",
    "manso": "quiet",
    "rara": "quirky",
    "raro": "quirky",
    "alocada": "rash",
    "alocado": "rash",
    "placida": "relaxed",
    "plácida": "relaxed",
    "placido": "relaxed",
    "plácido": "relaxed",
    "grosera": "sassy",
    "grosero": "sassy",
    "seria": "serious",
    "serio": "serious",
    "miedosa": "timid",
    "miedoso": "timid"
  }'::jsonb;
  v_valid_natures TEXT[] := ARRAY[
    'adamant', 'bashful', 'bold', 'brave', 'calm', 'careful', 'docile', 'gentle',
    'hardy', 'hasty', 'impish', 'jolly', 'lax', 'lonely', 'mild', 'modest',
    'naive', 'naughty', 'quiet', 'quirky', 'rash', 'relaxed', 'sassy', 'serious', 'timid'
  ];
  v_eggs JSONB;
  v_egg JSONB;
  v_new_eggs JSONB;
  v_species TEXT;
  v_nat TEXT;
  v_steps INT;
  v_total_steps INT;
  v_ivs JSONB;
  v_hp INT; v_atk INT; v_def INT; v_spa INT; v_spd INT; v_spe INT;
  v_uid TEXT;
  v_changed BOOLEAN;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL THEN
      CONTINUE;
    END IF;

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

    v_changed := FALSE;

    -- 1. Saneamiento de 'eggs' (Incubadora)
    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_egg IS NOT NULL AND jsonb_typeof(v_egg) = 'object' THEN
          -- Especie
          v_species := COALESCE(
            NULLIF(v_egg ->> 'id', ''),
            NULLIF(v_egg ->> 'pokemonId', ''),
            NULLIF(v_egg ->> 'species', ''),
            CASE
              WHEN (v_egg ->> 'uid') LIKE '%-%' AND split_part(v_egg ->> 'uid', '-', 1) NOT LIKE 'egg%' THEN split_part(v_egg ->> 'uid', '-', 1)
              ELSE NULL
            END,
            'togepi'
          );
          IF v_species LIKE 'egg_%' OR v_species = 'egg' OR v_species = 'test_egg_uid' OR v_species ~ '^[0-9]+$' THEN
            v_species := COALESCE(NULLIF(v_egg ->> 'pokemonId', ''), NULLIF(v_egg ->> 'species', ''), 'togepi');
            IF v_species LIKE 'egg_%' OR v_species = 'egg' THEN v_species := 'togepi'; END IF;
          END IF;
          v_egg := jsonb_set(v_egg, '{id}', to_jsonb(v_species));

          -- UID
          v_uid := COALESCE(NULLIF(v_egg ->> 'uid', ''), v_species || '-' || floor(extract(epoch from now()) * 1000)::text);
          v_egg := jsonb_set(v_egg, '{uid}', to_jsonb(v_uid));

          -- Naturaleza
          v_nat := lower(trim(COALESCE(v_egg ->> 'nature', '')));
          IF v_nature_map ? v_nat THEN
            v_nat := v_nature_map ->> v_nat;
          ELSIF NOT (v_nat = ANY(v_valid_natures)) THEN
            v_nat := 'serious';
          END IF;
          v_egg := jsonb_set(v_egg, '{nature}', to_jsonb(v_nat));

          -- Steps & TotalSteps
          v_total_steps := COALESCE((v_egg ->> 'totalSteps')::INT, (v_egg ->> 'steps')::INT, 1000);
          IF v_total_steps <= 0 THEN v_total_steps := 1000; END IF;
          v_steps := COALESCE((v_egg ->> 'steps')::INT, v_total_steps);
          v_egg := jsonb_set(v_egg, '{totalSteps}', to_jsonb(v_total_steps));
          v_egg := jsonb_set(v_egg, '{steps}', to_jsonb(v_steps));
          v_egg := jsonb_set(v_egg, '{ready}', to_jsonb(v_steps <= 0));

          -- IVs
          v_ivs := v_egg -> 'ivs';
          IF v_ivs IS NULL OR jsonb_typeof(v_ivs) != 'object' THEN
            v_ivs := jsonb_build_object(
              'hp', floor(random() * 32)::INT,
              'atk', floor(random() * 32)::INT,
              'def', floor(random() * 32)::INT,
              'spa', floor(random() * 32)::INT,
              'spd', floor(random() * 32)::INT,
              'spe', floor(random() * 32)::INT
            );
          ELSE
            v_hp := COALESCE((v_ivs ->> 'hp')::INT, floor(random() * 32)::INT);
            v_atk := COALESCE((v_ivs ->> 'atk')::INT, floor(random() * 32)::INT);
            v_def := COALESCE((v_ivs ->> 'def')::INT, floor(random() * 32)::INT);
            v_spa := COALESCE((v_ivs ->> 'spa')::INT, floor(random() * 32)::INT);
            v_spd := COALESCE((v_ivs ->> 'spd')::INT, floor(random() * 32)::INT);
            v_spe := COALESCE((v_ivs ->> 'spe')::INT, floor(random() * 32)::INT);
            v_ivs := jsonb_build_object(
              'hp', GREATEST(0, LEAST(31, v_hp)),
              'atk', GREATEST(0, LEAST(31, v_atk)),
              'def', GREATEST(0, LEAST(31, v_def)),
              'spa', GREATEST(0, LEAST(31, v_spa)),
              'spd', GREATEST(0, LEAST(31, v_spd)),
              'spe', GREATEST(0, LEAST(31, v_spe))
            );
          END IF;
          v_egg := jsonb_set(v_egg, '{ivs}', v_ivs);

          -- Flags
          v_egg := jsonb_set(v_egg, '{isShiny}', to_jsonb(COALESCE((v_egg ->> 'isShiny')::BOOLEAN, FALSE)));
          v_egg := jsonb_set(v_egg, '{isGuardian}', to_jsonb(COALESCE((v_egg ->> 'isGuardian')::BOOLEAN, FALSE)));
          v_egg := jsonb_set(v_egg, '{isNpc}', to_jsonb(COALESCE((v_egg ->> 'isNpc')::BOOLEAN, FALSE)));

          v_new_eggs := v_new_eggs || v_egg;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
      v_changed := TRUE;
    END IF;

    -- 2. Saneamiento de 'daycareWarehouse'
    v_eggs := v_save_data -> 'daycareWarehouse';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_egg IS NOT NULL AND jsonb_typeof(v_egg) = 'object' THEN
          v_species := COALESCE(
            NULLIF(v_egg ->> 'species', ''),
            NULLIF(v_egg ->> 'id', ''),
            'togepi'
          );
          IF v_species LIKE 'egg_%' OR v_species = 'egg' THEN v_species := 'togepi'; END IF;
          v_egg := jsonb_set(v_egg, '{species}', to_jsonb(v_species));
          v_egg := jsonb_set(v_egg, '{id}', to_jsonb(COALESCE(NULLIF(v_egg ->> 'id', ''), v_species || '-' || floor(extract(epoch from now()) * 1000)::text)));
          v_egg := jsonb_set(v_egg, '{name}', to_jsonb('Huevo Pokémon'::TEXT));
          v_egg := jsonb_set(v_egg, '{level}', to_jsonb(1::INT));
          v_egg := jsonb_set(v_egg, '{isEgg}', to_jsonb(TRUE));
          v_egg := jsonb_set(v_egg, '{isShiny}', to_jsonb(COALESCE((v_egg ->> 'isShiny')::BOOLEAN, FALSE)));

          -- Naturaleza
          v_nat := lower(trim(COALESCE(v_egg ->> 'nature', '')));
          IF v_nature_map ? v_nat THEN
            v_nat := v_nature_map ->> v_nat;
          ELSIF NOT (v_nat = ANY(v_valid_natures)) THEN
            v_nat := 'serious';
          END IF;
          v_egg := jsonb_set(v_egg, '{nature}', to_jsonb(v_nat));

          -- IVs
          v_ivs := v_egg -> 'ivs';
          IF v_ivs IS NULL OR jsonb_typeof(v_ivs) != 'object' THEN
            v_ivs := jsonb_build_object(
              'hp', floor(random() * 32)::INT,
              'atk', floor(random() * 32)::INT,
              'def', floor(random() * 32)::INT,
              'spa', floor(random() * 32)::INT,
              'spd', floor(random() * 32)::INT,
              'spe', floor(random() * 32)::INT
            );
          ELSE
            v_hp := COALESCE((v_ivs ->> 'hp')::INT, floor(random() * 32)::INT);
            v_atk := COALESCE((v_ivs ->> 'atk')::INT, floor(random() * 32)::INT);
            v_def := COALESCE((v_ivs ->> 'def')::INT, floor(random() * 32)::INT);
            v_spa := COALESCE((v_ivs ->> 'spa')::INT, floor(random() * 32)::INT);
            v_spd := COALESCE((v_ivs ->> 'spd')::INT, floor(random() * 32)::INT);
            v_spe := COALESCE((v_ivs ->> 'spe')::INT, floor(random() * 32)::INT);
            v_ivs := jsonb_build_object(
              'hp', GREATEST(0, LEAST(31, v_hp)),
              'atk', GREATEST(0, LEAST(31, v_atk)),
              'def', GREATEST(0, LEAST(31, v_def)),
              'spa', GREATEST(0, LEAST(31, v_spa)),
              'spd', GREATEST(0, LEAST(31, v_spd)),
              'spe', GREATEST(0, LEAST(31, v_spe))
            );
          END IF;
          v_egg := jsonb_set(v_egg, '{ivs}', v_ivs);

          v_new_eggs := v_new_eggs || v_egg;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{daycareWarehouse}', v_new_eggs);
      v_changed := TRUE;
    END IF;

    IF v_changed THEN
      UPDATE public.game_saves SET save_data = v_save_data, last_save_id = gen_random_uuid() WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830220000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

UPDATE public.game_saves SET last_save_id = gen_random_uuid();
