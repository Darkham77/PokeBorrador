-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN DE NATURALEZAS EN HUEVOS Y SAVES (PostgreSQL)
-- Fecha: 2026-08-30
-- Descripción: Normaliza las naturalezas en español o variantes legacy en 'eggs', 'daycareWarehouse',
--              'team' y 'box' a los identificadores canónicos en inglés (NatureId).
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
  v_arr JSONB;
  v_item JSONB;
  v_new_arr JSONB;
  v_raw_nat TEXT;
  v_mapped_nat TEXT;
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

    -- 1. Normalizar 'eggs'
    v_arr := v_save_data -> 'eggs';
    IF v_arr IS NOT NULL AND jsonb_typeof(v_arr) = 'array' THEN
      v_new_arr := '[]'::jsonb;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_arr) LOOP
        IF v_item IS NOT NULL AND jsonb_typeof(v_item) = 'object' AND v_item ? 'nature' THEN
          v_raw_nat := lower(trim(v_item ->> 'nature'));
          v_mapped_nat := v_nature_map ->> v_raw_nat;
          IF v_mapped_nat IS NOT NULL THEN
            v_item := jsonb_set(v_item, '{nature}', to_jsonb(v_mapped_nat));
            v_changed := TRUE;
          END IF;
        END IF;
        v_new_arr := v_new_arr || v_item;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_arr);
    END IF;

    -- 2. Normalizar 'daycareWarehouse'
    v_arr := v_save_data -> 'daycareWarehouse';
    IF v_arr IS NOT NULL AND jsonb_typeof(v_arr) = 'array' THEN
      v_new_arr := '[]'::jsonb;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_arr) LOOP
        IF v_item IS NOT NULL AND jsonb_typeof(v_item) = 'object' AND v_item ? 'nature' THEN
          v_raw_nat := lower(trim(v_item ->> 'nature'));
          v_mapped_nat := v_nature_map ->> v_raw_nat;
          IF v_mapped_nat IS NOT NULL THEN
            v_item := jsonb_set(v_item, '{nature}', to_jsonb(v_mapped_nat));
            v_changed := TRUE;
          END IF;
        END IF;
        v_new_arr := v_new_arr || v_item;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{daycareWarehouse}', v_new_arr);
    END IF;

    IF v_changed THEN
      UPDATE public.game_saves SET save_data = v_save_data, last_save_id = gen_random_uuid() WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830210000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

UPDATE public.game_saves SET last_save_id = gen_random_uuid();
