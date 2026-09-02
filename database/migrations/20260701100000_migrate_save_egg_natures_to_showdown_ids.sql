-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE NATURALEZAS DE HUEVOS EN SAVES
-- Fecha: 2026-07-01
-- Descripción: Migra naturalezas históricas en español en el array "eggs" de save_data a claves canónicas de Pokémon Showdown (NatureId).
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_eggs JSONB;
  v_new_eggs JSONB;
  v_egg JSONB;
  v_egg_nature TEXT;
  v_nature_map JSONB;
  v_key TEXT;
  v_new_nature TEXT;
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

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_eggs := v_save_data -> 'eggs';

    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        v_egg_nature := v_egg ->> 'nature';
        IF v_egg_nature IS NOT NULL THEN
          v_key := lower(v_egg_nature);
          IF v_nature_map ->> v_key IS NOT NULL THEN
            v_new_nature := v_nature_map ->> v_key;
            v_egg := jsonb_set(v_egg, '{nature}', to_jsonb(v_new_nature));
          END IF;
        END IF;
        v_new_eggs := v_new_eggs || v_egg;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
    END IF;

    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260701100000'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
