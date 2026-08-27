-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN DE ENEMYTEAM EN COMBATES ACTIVOS (PostgreSQL)
-- Fecha: 2026-08-26
-- Descripción: Normaliza y asigna estáticamente 'species' y valores canónicos a todos los Pokémon
--              en activeBattle.enemyTeam de game_saves para garantizar paridad SSoT 1:1 con pokemonSchema.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_active_battle JSONB;
  v_enemy_team JSONB;
  v_poke JSONB;
  v_new_enemy_team JSONB;
  v_status TEXT;
  v_clean_status JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL OR jsonb_typeof(v_save_data) != 'object' THEN
      CONTINUE;
    END IF;

    v_active_battle := v_save_data -> 'activeBattle';
    IF v_active_battle IS NOT NULL AND jsonb_typeof(v_active_battle) = 'object' THEN
      v_enemy_team := v_active_battle -> 'enemyTeam';
      IF v_enemy_team IS NOT NULL AND jsonb_typeof(v_enemy_team) = 'array' THEN
        v_new_enemy_team := '[]'::jsonb;
        FOR v_poke IN SELECT * FROM jsonb_array_elements(v_enemy_team) LOOP
          IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
            IF v_poke -> 'species' IS NULL THEN
              v_poke := jsonb_set(v_poke, '{species}', coalesce(v_poke -> 'id', '""'::jsonb));
            END IF;
            IF v_poke -> 'isShiny' IS NULL OR jsonb_typeof(v_poke -> 'isShiny') != 'boolean' THEN
              v_poke := jsonb_set(v_poke, '{isShiny}', 'false'::jsonb);
            END IF;
            IF v_poke -> 'expNeeded' IS NULL THEN
              v_poke := jsonb_set(v_poke, '{expNeeded}', '100'::jsonb);
            END IF;
            v_status := lower(coalesce(v_poke ->> 'status', ''));
            IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
            ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
            ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
            ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
            ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
            ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
            ELSE v_clean_status := '""'::jsonb;
            END IF;
            v_poke := jsonb_set(v_poke, '{status}', v_clean_status);
            IF v_poke -> 'friendship' IS NULL THEN
              v_poke := jsonb_set(v_poke, '{friendship}', '70'::jsonb);
            END IF;
            v_new_enemy_team := v_new_enemy_team || v_poke;
          END IF;
        END LOOP;
        v_active_battle := jsonb_set(v_active_battle, '{enemyTeam}', v_new_enemy_team);
        v_save_data := jsonb_set(v_save_data, '{activeBattle}', v_active_battle);
        UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
      END IF;
    END IF;
  END LOOP;
END $$;
