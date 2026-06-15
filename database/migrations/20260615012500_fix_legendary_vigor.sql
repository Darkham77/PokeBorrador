-- =====================================================
-- POKÉ VICIO — MIGRACIÓN VIGOR DE LEGENDARIOS A 0 (v6)
-- Fecha: 2026-06-15
-- Descripción: Recorre todos los save_data en game_saves,
-- localiza Pokémon legendarios en 'team' y 'box', 
-- y establece su vigor en 0.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_pokemon JSONB;
  v_updated_team JSONB;
  v_updated_box JSONB;
  v_is_legendary BOOLEAN;
  v_pokemon_id TEXT;
  legendaries TEXT[] := ARRAY['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'ho_oh', 'ho-oh', 'celebi'];
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    
    -- 1. Procesar equipo (team)
    IF v_save_data ? 'team' AND jsonb_typeof(v_save_data->'team') = 'array' THEN
      v_updated_team := '[]'::jsonb;
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'team') LOOP
        v_is_legendary := FALSE;
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := lower(v_pokemon->>'id');
          IF v_pokemon_id = ANY(legendaries) THEN
            v_is_legendary := TRUE;
          END IF;
        END IF;
        
        IF v_is_legendary THEN
          v_pokemon := jsonb_set(v_pokemon, '{vigor}', '0'::jsonb);
        END IF;
        
        v_updated_team := v_updated_team || jsonb_build_array(v_pokemon);
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_updated_team);
    END IF;

    -- 2. Procesar caja (box)
    IF v_save_data ? 'box' AND jsonb_typeof(v_save_data->'box') = 'array' THEN
      v_updated_box := '[]'::jsonb;
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'box') LOOP
        v_is_legendary := FALSE;
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := lower(v_pokemon->>'id');
          IF v_pokemon_id = ANY(legendaries) THEN
            v_is_legendary := TRUE;
          END IF;
        END IF;
        
        IF v_is_legendary THEN
          v_pokemon := jsonb_set(v_pokemon, '{vigor}', '0'::jsonb);
        END IF;
        
        v_updated_box := v_updated_box || jsonb_build_array(v_pokemon);
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_updated_box);
    END IF;

    UPDATE public.game_saves
    SET save_data = v_save_data,
        last_save_id = gen_random_uuid()
    WHERE user_id = r.user_id;
  END LOOP;

  -- Actualizar versión del esquema en profiles
  UPDATE public.profiles SET db_version = 6;
  ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 6;
END $$;

-- Actualizar db_version en system_config
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260615012500'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Rotar last_save_id para TODOS los jugadores para forzar desincronización y recarga limpia
UPDATE public.game_saves SET last_save_id = gen_random_uuid();
