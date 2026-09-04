-- PostgreSQL Migration: 20260902120000_normalize_all_natures_and_relearner_items
-- Description: Exhaustive normalization of all legacy nature strings and move_relearner item keys across saves, market listings, trades, and war defenders.

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_eggs JSONB;
  v_inventory JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_new_eggs JSONB;
  v_new_inventory JSONB;
  v_poke JSONB;
  v_egg JSONB;
  v_nature TEXT;
  v_norm_nature TEXT;
  v_item_key TEXT;
  v_item_qty INT;
  v_nature_map JSONB;
BEGIN
  v_nature_map := '{
    "serio": "serious",
    "seria": "serious",
    "serious": "serious",
    "firme": "adamant",
    "adamant": "adamant",
    "timido": "bashful",
    "timida": "bashful",
    "tímido": "bashful",
    "tímida": "bashful",
    "bashful": "bashful",
    "osado": "bold",
    "osada": "bold",
    "bold": "bold",
    "audaz": "brave",
    "brave": "brave",
    "sereno": "calm",
    "serena": "calm",
    "calm": "calm",
    "cauto": "careful",
    "cauta": "careful",
    "careful": "careful",
    "docil": "docile",
    "dócil": "docile",
    "docile": "docile",
    "amable": "gentle",
    "gentle": "gentle",
    "fuerte": "hardy",
    "hardy": "hardy",
    "activa": "hasty",
    "activo": "hasty",
    "active": "hasty",
    "hasty": "hasty",
    "agitada": "impish",
    "agitado": "impish",
    "impish": "impish",
    "alegre": "jolly",
    "jovial": "jolly",
    "jolly": "jolly",
    "floja": "lax",
    "flojo": "lax",
    "lax": "lax",
    "hurana": "lonely",
    "hurano": "lonely",
    "huraña": "lonely",
    "huraño": "lonely",
    "lonely": "lonely",
    "afable": "mild",
    "moderada": "mild",
    "moderado": "mild",
    "mild": "mild",
    "modesta": "modest",
    "modesto": "modest",
    "modest": "modest",
    "ingenua": "naive",
    "ingenuo": "naive",
    "naive": "naive",
    "picara": "naughty",
    "picaro": "naughty",
    "pícara": "naughty",
    "pícaro": "naughty",
    "naughty": "naughty",
    "mansa": "quiet",
    "manso": "quiet",
    "tranquila": "quiet",
    "tranquilo": "quiet",
    "tasa": "quiet",
    "quiet": "quiet",
    "rara": "quirky",
    "raro": "quirky",
    "quirky": "quirky",
    "alocada": "rash",
    "alocado": "rash",
    "rash": "rash",
    "placida": "relaxed",
    "placido": "relaxed",
    "plácida": "relaxed",
    "plácido": "relaxed",
    "relaxed": "relaxed",
    "grosera": "sassy",
    "grosero": "sassy",
    "sassy": "sassy",
    "miedosa": "timid",
    "miedoso": "timid",
    "timid": "timid"
  }'::jsonb;

  -- 1. Traverse all player saves in game_saves
  FOR r IN SELECT user_id, save_data FROM public.game_saves WHERE save_data IS NOT NULL LOOP
    v_save_data := r.save_data;

    -- Safe unwrap stringified JSONB scalars (Rule 10)
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

    -- 1.1 Team Normalization
    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF jsonb_typeof(v_poke) = 'object' THEN
          v_nature := v_poke ->> 'nature';
          IF v_nature IS NOT NULL THEN
            v_norm_nature := v_nature_map ->> lower(v_nature);
            IF v_norm_nature IS NOT NULL THEN
              v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
            ELSE
              v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
            END IF;
          END IF;
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- 1.2 Box Normalization
    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF jsonb_typeof(v_poke) = 'object' THEN
          v_nature := v_poke ->> 'nature';
          IF v_nature IS NOT NULL THEN
            v_norm_nature := v_nature_map ->> lower(v_nature);
            IF v_norm_nature IS NOT NULL THEN
              v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
            ELSE
              v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
            END IF;
          END IF;
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    -- 1.3 Eggs Normalization
    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF jsonb_typeof(v_egg) = 'object' THEN
          v_nature := v_egg ->> 'nature';
          IF v_nature IS NOT NULL THEN
            v_norm_nature := v_nature_map ->> lower(v_nature);
            IF v_norm_nature IS NOT NULL THEN
              v_egg := jsonb_set(v_egg, '{nature}', to_jsonb(v_norm_nature));
            ELSE
              v_egg := jsonb_set(v_egg, '{nature}', to_jsonb(lower(v_nature)));
            END IF;
          END IF;
        END IF;
        v_new_eggs := v_new_eggs || v_egg;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
    END IF;

    -- 1.4 Inventory move_relearner -> moverelearner Normalization
    v_inventory := v_save_data -> 'inventory';
    IF v_inventory IS NOT NULL AND jsonb_typeof(v_inventory) = 'object' THEN
      IF (v_inventory -> 'move_relearner') IS NOT NULL THEN
        v_item_qty := COALESCE((v_inventory ->> 'move_relearner')::int, 0);
        IF v_item_qty > 0 THEN
          v_item_qty := v_item_qty + COALESCE((v_inventory ->> 'moverelearner')::int, 0);
          v_inventory := jsonb_set(v_inventory, '{moverelearner}', to_jsonb(v_item_qty));
        END IF;
        v_inventory := v_inventory - 'move_relearner';
        v_save_data := jsonb_set(v_save_data, '{inventory}', v_inventory);
      END IF;
    END IF;

    -- Update row
    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  -- 2. Update system_config db_version
  INSERT INTO public.system_config (key, value)
  VALUES ('db_version', '20260902120000'::jsonb)
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
