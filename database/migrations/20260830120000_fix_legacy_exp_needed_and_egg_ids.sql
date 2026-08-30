-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: EXP_NEEDED Y HUEVOS IDS (PostgreSQL)
-- Fecha: 2026-08-30
-- Descripción: Corrige valores 'null' o no numéricos en expNeeded (Pokémon nivel 100)
--              y convierte IDs numéricos de huevos en strings para cumplir con saveDataSchema.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_eggs JSONB;
  v_poke JSONB;
  v_egg JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_new_eggs JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL OR jsonb_typeof(v_save_data) != 'object' THEN
      CONTINUE;
    END IF;

    -- 1. Normalizar Pokémon en Team
    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          IF (coalesce(v_poke ->> 'level', '1'))::int >= 100 THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '0'::jsonb);
          ELSIF v_poke -> 'expNeeded' IS NULL OR jsonb_typeof(v_poke -> 'expNeeded') = 'null' OR jsonb_typeof(v_poke -> 'expNeeded') != 'number' THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '100'::jsonb);
          END IF;
          v_new_team := v_new_team || v_poke;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- 2. Normalizar Pokémon en Box
    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          IF (coalesce(v_poke ->> 'level', '1'))::int >= 100 THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '0'::jsonb);
          ELSIF v_poke -> 'expNeeded' IS NULL OR jsonb_typeof(v_poke -> 'expNeeded') = 'null' OR jsonb_typeof(v_poke -> 'expNeeded') != 'number' THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '100'::jsonb);
          END IF;
          v_new_box := v_new_box || v_poke;
        ELSIF v_poke IS NULL OR jsonb_typeof(v_poke) = 'null' THEN
          v_new_box := v_new_box || 'null'::jsonb;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    -- 3. Normalizar Huevos (eggs)
    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_egg IS NOT NULL AND jsonb_typeof(v_egg) = 'object' THEN
          IF v_egg -> 'id' IS NULL OR jsonb_typeof(v_egg -> 'id') = 'null' THEN
            v_egg := jsonb_set(v_egg, '{id}', to_jsonb('egg_' || md5(random()::text)));
          ELSIF jsonb_typeof(v_egg -> 'id') = 'number' THEN
            v_egg := jsonb_set(v_egg, '{id}', to_jsonb(v_egg ->> 'id'));
          END IF;
          v_new_eggs := v_new_eggs || v_egg;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
    END IF;

    UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830120000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
