-- =====================================================
-- POKÉ VICIO — MIGRACIÓN PARCHE DE SANACIÓN Y VIGOR LEGENDARIO (v6)
-- Fecha: 2026-06-15
-- Descripción: Limpia permanentemente en la base de datos de producción:
-- 1. Fuerza el vigor de Pokémon legendarios a 0.
-- 2. Corrige objetos equipados (heldItem) heredados a sus IDs oficiales en inglés.
-- 3. Traduce habilidades legacy en español a sus nombres oficiales.
-- 4. Corrige movimientos (moves) con IDs en español a sus IDs oficiales en inglés.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_pokemon JSONB;
  v_updated_team JSONB;
  v_updated_box JSONB;
  v_pokemon_id TEXT;
  v_held_item TEXT;
  v_ability TEXT;
  v_ability_norm TEXT;
  v_move JSONB;
  v_updated_moves JSONB;
  v_move_id TEXT;
  v_move_id_norm TEXT;
  
  legendaries TEXT[] := ARRAY['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'ho_oh', 'ho-oh', 'celebi'];
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    
    -- --- 1. PROCESAR EQUIPO (TEAM) ---
    IF v_save_data ? 'team' AND jsonb_typeof(v_save_data->'team') = 'array' THEN
      v_updated_team := '[]'::jsonb;
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'team') LOOP
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := lower(v_pokemon->>'id');
          
          -- A. Corregir vigor de legendarios
          IF v_pokemon_id = ANY(legendaries) THEN
            v_pokemon := jsonb_set(v_pokemon, '{vigor}', '0'::jsonb);
          END IF;
          
          -- B. Corregir objeto equipado (heldItem)
          IF v_pokemon ? 'heldItem' AND v_pokemon->>'heldItem' IS NOT NULL THEN
            v_held_item := lower(trim(v_pokemon->>'heldItem'));
            CASE v_held_item
              WHEN 'pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"potion"');
              WHEN 'super_pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"super_potion"');
              WHEN 'hiper_pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"hyper_potion"');
              WHEN 'pocion_max' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"max_potion"');
              WHEN 'piedra_fuego' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"fire_stone"');
              WHEN 'piedra_agua' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"water_stone"');
              WHEN 'piedra_trueno' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"thunder_stone"');
              WHEN 'piedra_hoja' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"leaf_stone"');
              WHEN 'piedra_luna' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"moon_stone"');
              WHEN 'piedra_solar' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"sun_stone"');
              WHEN 'caramelo_vigor' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"vigor_candy"');
              WHEN 'repelente' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"repel"');
              ELSE NULL;
            END CASE;
          END IF;
          
          -- C. Corregir Habilidad
          IF v_pokemon ? 'ability' AND v_pokemon->>'ability' IS NOT NULL THEN
            v_ability := v_pokemon->>'ability';
            v_ability_norm := lower(regexp_replace(translate(v_ability, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU'), '[^a-z0-9]', '', 'g'));
            CASE v_ability_norm
              WHEN 'escape' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Fuga"');
              WHEN 'metamorfosis' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Mudar"');
              WHEN 'escudopolvo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Polvo escudo"');
              WHEN 'polvoescudo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Polvo escudo"');
              WHEN 'correcaminos' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Fuga"');
              WHEN 'obstruir' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Insonorizar"');
              WHEN 'escurridizo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Flexibilidad"');
              WHEN 'puntocura' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Cura Natural"');
              WHEN 'chlorophyll' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Clorofila"');
              WHEN 'overgrow' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Espesura"');
              WHEN 'blaze' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Mar llamas"');
              WHEN 'torrent' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Torrente"');
              WHEN 'static' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Electricidad estática"');
              WHEN 'puntotoxico' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Punto tóxico"');
              WHEN 'vistalince' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Vista lince"');
              WHEN 'focointerno' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Foco interno"');
              WHEN 'nadorapido' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Nado rápido"');
              WHEN 'velohumedo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Velo húmedo"');
              ELSE NULL;
            END CASE;
          END IF;
          
          -- D. Corregir movimientos
          IF v_pokemon ? 'moves' AND jsonb_typeof(v_pokemon->'moves') = 'array' THEN
            v_updated_moves := '[]'::jsonb;
            FOR v_move IN SELECT jsonb_array_elements(v_pokemon->'moves') LOOP
              IF v_move ? 'id' AND v_move->>'id' IS NOT NULL THEN
                v_move_id := v_move->>'id';
                v_move_id_norm := lower(regexp_replace(v_move_id, '[\s_-]+', '_', 'g'));
                CASE v_move_id_norm
                  WHEN 'cuerpo_pesado' THEN v_move := jsonb_set(v_move, '{id}', '"heavy_slam"');
                  WHEN 'hiper_colmillo' THEN v_move := jsonb_set(v_move, '{id}', '"hyper_fang"');
                  WHEN 'patada_salto_alta' THEN v_move := jsonb_set(v_move, '{id}', '"high_jump_kick"');
                  WHEN 'pajaro_osado' THEN v_move := jsonb_set(v_move, '{id}', '"brave_bird"');
                  WHEN 'engullir' THEN v_move := jsonb_set(v_move, '{id}', '"swallow"');
                  WHEN 'somnifera' THEN v_move := jsonb_set(v_move, '{id}', '"sleep_powder"');
                  WHEN 'velocidad_extrema' THEN v_move := jsonb_set(v_move, '{id}', '"extreme_speed"');
                  WHEN 'mismodestino' THEN v_move := jsonb_set(v_move, '{id}', '"destiny_bond"');
                  WHEN 'pantalla_humo' THEN v_move := jsonb_set(v_move, '{id}', '"smokescreen"');
                  WHEN 'super_colmillo' THEN v_move := jsonb_set(v_move, '{id}', '"super_fang"');
                  WHEN 'huevo_bomba' THEN v_move := jsonb_set(v_move, '{id}', '"egg_bomb"');
                  WHEN 'hueso_rus' THEN v_move := jsonb_set(v_move, '{id}', '"bone_rush"');
                  WHEN 'mega_patada' THEN v_move := jsonb_set(v_move, '{id}', '"mega_kick"');
                  WHEN 'mega_puno' THEN v_move := jsonb_set(v_move, '{id}', '"mega_punch"');
                  WHEN 'pozo_venenoso' THEN v_move := jsonb_set(v_move, '{id}', '"toxic_spikes"');
                  WHEN 'vampiro' THEN v_move := jsonb_set(v_move, '{id}', '"horn_leech"');
                  WHEN 'psicocorte' THEN v_move := jsonb_set(v_move, '{id}', '"psycho_cut"');
                  WHEN 'arena' THEN v_move := jsonb_set(v_move, '{id}', '"sand_attack"');
                  WHEN 'minimizar' THEN v_move := jsonb_set(v_move, '{id}', '"minimize"');
                  WHEN 'golpe_karatazo' THEN v_move := jsonb_set(v_move, '{id}', '"karate_chop"');
                  WHEN 'mov_sismico' THEN v_move := jsonb_set(v_move, '{id}', '"seismic_toss"');
                  WHEN 'tajo_aereo' THEN v_move := jsonb_set(v_move, '{id}', '"air_slash"');
                  WHEN 'acidificacion' THEN v_move := jsonb_set(v_move, '{id}', '"acid_armor"');
                  WHEN 'recurrente' THEN v_move := jsonb_set(v_move, '{id}', '"bullet_seed"');
                  WHEN 'tormenta_de_arena' THEN v_move := jsonb_set(v_move, '{id}', '"sandstorm"');
                  ELSE NULL;
                END CASE;
              END IF;
              v_updated_moves := v_updated_moves || jsonb_build_array(v_move);
            END LOOP;
            v_pokemon := jsonb_set(v_pokemon, '{moves}', v_updated_moves);
          END IF;
          
        END IF;
        v_updated_team := v_updated_team || jsonb_build_array(v_pokemon);
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_updated_team);
    END IF;

    -- --- 2. PROCESAR CAJA (BOX) ---
    IF v_save_data ? 'box' AND jsonb_typeof(v_save_data->'box') = 'array' THEN
      v_updated_box := '[]'::jsonb;
      FOR v_pokemon IN SELECT jsonb_array_elements(v_save_data->'box') LOOP
        IF v_pokemon ? 'id' THEN
          v_pokemon_id := lower(v_pokemon->>'id');
          
          -- A. Corregir vigor de legendarios
          IF v_pokemon_id = ANY(legendaries) THEN
            v_pokemon := jsonb_set(v_pokemon, '{vigor}', '0'::jsonb);
          END IF;
          
          -- B. Corregir objeto equipado (heldItem)
          IF v_pokemon ? 'heldItem' AND v_pokemon->>'heldItem' IS NOT NULL THEN
            v_held_item := lower(trim(v_pokemon->>'heldItem'));
            CASE v_held_item
              WHEN 'pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"potion"');
              WHEN 'super_pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"super_potion"');
              WHEN 'hiper_pocion' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"hyper_potion"');
              WHEN 'pocion_max' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"max_potion"');
              WHEN 'piedra_fuego' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"fire_stone"');
              WHEN 'piedra_agua' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"water_stone"');
              WHEN 'piedra_trueno' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"thunder_stone"');
              WHEN 'piedra_hoja' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"leaf_stone"');
              WHEN 'piedra_luna' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"moon_stone"');
              WHEN 'piedra_solar' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"sun_stone"');
              WHEN 'caramelo_vigor' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"vigor_candy"');
              WHEN 'repelente' THEN v_pokemon := jsonb_set(v_pokemon, '{heldItem}', '"repel"');
              ELSE NULL;
            END CASE;
          END IF;
          
          -- C. Corregir Habilidad
          IF v_pokemon ? 'ability' AND v_pokemon->>'ability' IS NOT NULL THEN
            v_ability := v_pokemon->>'ability';
            v_ability_norm := lower(regexp_replace(translate(v_ability, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU'), '[^a-z0-9]', '', 'g'));
            CASE v_ability_norm
              WHEN 'escape' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Fuga"');
              WHEN 'metamorfosis' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Mudar"');
              WHEN 'escudopolvo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Polvo escudo"');
              WHEN 'polvoescudo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Polvo escudo"');
              WHEN 'correcaminos' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Fuga"');
              WHEN 'obstruir' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Insonorizar"');
              WHEN 'escurridizo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Flexibilidad"');
              WHEN 'puntocura' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Cura Natural"');
              WHEN 'chlorophyll' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Clorofila"');
              WHEN 'overgrow' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Espesura"');
              WHEN 'blaze' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Mar llamas"');
              WHEN 'torrent' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Torrente"');
              WHEN 'static' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Electricidad estática"');
              WHEN 'puntotoxico' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Punto tóxico"');
              WHEN 'vistalince' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Vista lince"');
              WHEN 'focointerno' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Foco interno"');
              WHEN 'nadorapido' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Nado rápido"');
              WHEN 'velohumedo' THEN v_pokemon := jsonb_set(v_pokemon, '{ability}', '"Velo húmedo"');
              ELSE NULL;
            END CASE;
          END IF;
          
          -- D. Corregir movimientos
          IF v_pokemon ? 'moves' AND jsonb_typeof(v_pokemon->'moves') = 'array' THEN
            v_updated_moves := '[]'::jsonb;
            FOR v_move IN SELECT jsonb_array_elements(v_pokemon->'moves') LOOP
              IF v_move ? 'id' AND v_move->>'id' IS NOT NULL THEN
                v_move_id := v_move->>'id';
                v_move_id_norm := lower(regexp_replace(v_move_id, '[\s_-]+', '_', 'g'));
                CASE v_move_id_norm
                  WHEN 'cuerpo_pesado' THEN v_move := jsonb_set(v_move, '{id}', '"heavy_slam"');
                  WHEN 'hiper_colmillo' THEN v_move := jsonb_set(v_move, '{id}', '"hyper_fang"');
                  WHEN 'patada_salto_alta' THEN v_move := jsonb_set(v_move, '{id}', '"high_jump_kick"');
                  WHEN 'pajaro_osado' THEN v_move := jsonb_set(v_move, '{id}', '"brave_bird"');
                  WHEN 'engullir' THEN v_move := jsonb_set(v_move, '{id}', '"swallow"');
                  WHEN 'somnifera' THEN v_move := jsonb_set(v_move, '{id}', '"sleep_powder"');
                  WHEN 'velocidad_extrema' THEN v_move := jsonb_set(v_move, '{id}', '"extreme_speed"');
                  WHEN 'mismodestino' THEN v_move := jsonb_set(v_move, '{id}', '"destiny_bond"');
                  WHEN 'pantalla_humo' THEN v_move := jsonb_set(v_move, '{id}', '"smokescreen"');
                  WHEN 'super_colmillo' THEN v_move := jsonb_set(v_move, '{id}', '"super_fang"');
                  WHEN 'huevo_bomba' THEN v_move := jsonb_set(v_move, '{id}', '"egg_bomb"');
                  WHEN 'hueso_rus' THEN v_move := jsonb_set(v_move, '{id}', '"bone_rush"');
                  WHEN 'mega_patada' THEN v_move := jsonb_set(v_move, '{id}', '"mega_kick"');
                  WHEN 'mega_puno' THEN v_move := jsonb_set(v_move, '{id}', '"mega_punch"');
                  WHEN 'pozo_venenoso' THEN v_move := jsonb_set(v_move, '{id}', '"toxic_spikes"');
                  WHEN 'vampiro' THEN v_move := jsonb_set(v_move, '{id}', '"horn_leech"');
                  WHEN 'psicocorte' THEN v_move := jsonb_set(v_move, '{id}', '"psycho_cut"');
                  WHEN 'arena' THEN v_move := jsonb_set(v_move, '{id}', '"sand_attack"');
                  WHEN 'minimizar' THEN v_move := jsonb_set(v_move, '{id}', '"minimize"');
                  WHEN 'golpe_karatazo' THEN v_move := jsonb_set(v_move, '{id}', '"karate_chop"');
                  WHEN 'mov_sismico' THEN v_move := jsonb_set(v_move, '{id}', '"seismic_toss"');
                  WHEN 'tajo_aereo' THEN v_move := jsonb_set(v_move, '{id}', '"air_slash"');
                  WHEN 'acidificacion' THEN v_move := jsonb_set(v_move, '{id}', '"acid_armor"');
                  WHEN 'recurrente' THEN v_move := jsonb_set(v_move, '{id}', '"bullet_seed"');
                  WHEN 'tormenta_de_arena' THEN v_move := jsonb_set(v_move, '{id}', '"sandstorm"');
                  ELSE NULL;
                END CASE;
              END IF;
              v_updated_moves := v_updated_moves || jsonb_build_array(v_move);
            END LOOP;
            v_pokemon := jsonb_set(v_pokemon, '{moves}', v_updated_moves);
          END IF;
          
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
