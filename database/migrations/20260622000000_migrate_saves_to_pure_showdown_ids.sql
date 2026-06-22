-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES A IDS DE SHOWDOWN PUROS
-- Fecha: 2026-06-22
-- Descripción: Migra los saves de base de datos PostgreSQL (Supabase) eliminando guiones de especies (nidoran_m, nidoran_f, mr_mime, ho_oh).
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_poke JSONB;
  v_poke_id TEXT;
  v_species TEXT;
  v_pokedex JSONB;
  v_new_pokedex JSONB;
  v_seen_pokedex JSONB;
  v_new_seen_pokedex JSONB;
  v_val TEXT;
  
  -- Helper normalization map
  v_species_map JSONB;
  v_species_key TEXT;
BEGIN
  -- Mappings para corregir los IDs con guiones bajos remanentes
  v_species_map := '{
    "nidoran_f": "nidoranf",
    "nidoran_m": "nidoranm",
    "mr_mime": "mrmime",
    "ho_oh": "hooh",
    "ho-oh": "hooh"
  }'::jsonb;

  -- 1. Procesar game_saves
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_team := v_save_data -> 'team';
    v_box := v_save_data -> 'box';
    v_pokedex := v_save_data -> 'pokedex';
    v_seen_pokedex := v_save_data -> 'seenPokedex';

    -- A. Process Team
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        -- Corrección en id y species
        v_poke_id := v_poke ->> 'id';
        IF v_poke_id IS NOT NULL THEN
          v_species_key := lower(v_poke_id);
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{id}', to_jsonb(v_species_map ->> v_species_key));
          END IF;
        END IF;

        v_species := v_poke ->> 'species';
        IF v_species IS NOT NULL THEN
          v_species_key := lower(v_species);
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species_map ->> v_species_key));
          END IF;
        END IF;

        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- B. Process Box
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        -- Corrección en id y species
        v_poke_id := v_poke ->> 'id';
        IF v_poke_id IS NOT NULL THEN
          v_species_key := lower(v_poke_id);
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{id}', to_jsonb(v_species_map ->> v_species_key));
          END IF;
        END IF;

        v_species := v_poke ->> 'species';
        IF v_species IS NOT NULL THEN
          v_species_key := lower(v_species);
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species_map ->> v_species_key));
          END IF;
        END IF;

        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    -- C. Process Pokedex
    IF v_pokedex IS NOT NULL AND jsonb_typeof(v_pokedex) = 'array' THEN
      v_new_pokedex := '[]'::jsonb;
      FOR v_val IN SELECT * FROM jsonb_array_elements_text(v_pokedex) LOOP
        IF v_species_map ->> v_val IS NOT NULL THEN
          v_new_pokedex := v_new_pokedex || to_jsonb(v_species_map ->> v_val);
        ELSE
          v_new_pokedex := v_new_pokedex || to_jsonb(v_val);
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{pokedex}', v_new_pokedex);
    END IF;

    -- D. Process Seen Pokedex
    IF v_seen_pokedex IS NOT NULL AND jsonb_typeof(v_seen_pokedex) = 'array' THEN
      v_new_seen_pokedex := '[]'::jsonb;
      FOR v_val IN SELECT * FROM jsonb_array_elements_text(v_seen_pokedex) LOOP
        IF v_species_map ->> v_val IS NOT NULL THEN
          v_new_seen_pokedex := v_new_seen_pokedex || to_jsonb(v_species_map ->> v_val);
        ELSE
          v_new_seen_pokedex := v_new_seen_pokedex || to_jsonb(v_val);
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{seenPokedex}', v_new_seen_pokedex);
    END IF;

    -- Write back to PostgreSQL
    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  -- 2. Actualizar db_version
  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260622000000'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
