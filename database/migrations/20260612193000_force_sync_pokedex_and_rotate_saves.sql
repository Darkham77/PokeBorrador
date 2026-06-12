-- =====================================================
-- POKÉ VICIO — MIGRACIÓN SEGURA SINCRO DE POKÉDEX (v5)
-- Fecha: 2026-06-12
-- Descripción: Fuerza la sincronización de las listas de pokedex y seenPokedex
-- en base a equipo/caja, actualiza la versión del esquema a 5, y
-- rota last_save_id globalmente para forzar a los clientes activos a sincronizar.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_pokemon_id TEXT;
  v_pokedex_ids TEXT[];
  v_seen_ids TEXT[];
  v_updated_pokedex JSONB;
  v_updated_seen JSONB;
  v_pokemon JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    
    v_pokedex_ids := ARRAY[]::TEXT[];
    v_seen_ids := ARRAY[]::TEXT[];
    
    -- Obtener pokedex actual
    IF v_save_data ? 'pokedex' AND jsonb_typeof(v_save_data->'pokedex') = 'array' THEN
      SELECT COALESCE(ARRAY_AGG(DISTINCT val), ARRAY[]::TEXT[]) INTO v_pokedex_ids
      FROM jsonb_array_elements_text(v_save_data->'pokedex') AS val
      WHERE val IS NOT NULL;
    END IF;
    
    -- Obtener seenPokedex actual
    IF v_save_data ? 'seenPokedex' AND jsonb_typeof(v_save_data->'seenPokedex') = 'array' THEN
      SELECT COALESCE(ARRAY_AGG(DISTINCT val), ARRAY[]::TEXT[]) INTO v_seen_ids
      FROM jsonb_array_elements_text(v_save_data->'seenPokedex') AS val
      WHERE val IS NOT NULL;
    END IF;

    IF v_pokedex_ids IS NULL THEN
      v_pokedex_ids := ARRAY[]::TEXT[];
    END IF;
    IF v_seen_ids IS NULL THEN
      v_seen_ids := ARRAY[]::TEXT[];
    END IF;

    -- Procesar pokémones del equipo
    IF v_save_data ? 'team' AND jsonb_typeof(v_save_data->'team') = 'array' THEN
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'team') LOOP
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := v_pokemon->>'id';
          IF v_pokemon_id IS NOT NULL AND v_pokemon_id != '' THEN
            IF NOT (v_pokedex_ids @> ARRAY[v_pokemon_id]) THEN
              v_pokedex_ids := array_append(v_pokedex_ids, v_pokemon_id);
            END IF;
            IF NOT (v_seen_ids @> ARRAY[v_pokemon_id]) THEN
              v_seen_ids := array_append(v_seen_ids, v_pokemon_id);
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Procesar pokémones de la caja
    IF v_save_data ? 'box' AND jsonb_typeof(v_save_data->'box') = 'array' THEN
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'box') LOOP
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := v_pokemon->>'id';
          IF v_pokemon_id IS NOT NULL AND v_pokemon_id != '' THEN
            IF NOT (v_pokedex_ids @> ARRAY[v_pokemon_id]) THEN
              v_pokedex_ids := array_append(v_pokedex_ids, v_pokemon_id);
            END IF;
            IF NOT (v_seen_ids @> ARRAY[v_pokemon_id]) THEN
              v_seen_ids := array_append(v_seen_ids, v_pokemon_id);
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_updated_pokedex := COALESCE(to_jsonb(v_pokedex_ids), '[]'::jsonb);
    v_updated_seen := COALESCE(to_jsonb(v_seen_ids), '[]'::jsonb);

    v_save_data := v_save_data || jsonb_build_object(
      'pokedex', v_updated_pokedex,
      'seenPokedex', v_updated_seen
    );

    UPDATE public.game_saves
    SET save_data = v_save_data,
        last_save_id = gen_random_uuid()
    WHERE user_id = r.user_id;
  END LOOP;

  -- Actualizar versión del esquema en profiles
  UPDATE public.profiles SET db_version = 5;
  ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 5;
END $$;

-- Actualizar db_version en system_config
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260612193000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Rotar last_save_id para TODOS los jugadores para forzar desincronización y recarga limpia
UPDATE public.game_saves SET last_save_id = gen_random_uuid();
