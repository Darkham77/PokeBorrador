-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE PERSISTENCIA: NORMALIZACIÓN DE ITEM IDS EN DAYCARE MISSIONS
-- Fecha: 2026-09-07
-- Descripción: Normaliza IDs de ítems antiguos (ej: berry_silver -> berrysilver) en las recompensas de misiones de guardería (daycare_missions).
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_missions JSONB;
  v_new_missions JSONB;
  v_mission JSONB;
  v_reward JSONB;
  v_item_id TEXT;
  v_item_map JSONB;
  v_key TEXT;
  v_new_item_id TEXT;
BEGIN
  v_item_map := '{
    "berry_bronze": "berrybronze",
    "berry_silver": "berrysilver",
    "berry_gold": "berrygold",
    "everstone": "everstone",
    "destiny_knot": "destinyknot",
    "power_weight": "powerweight",
    "power_bracer": "powerbracer",
    "power_belt": "powerbelt",
    "power_lens": "powerlens",
    "power_band": "powerband",
    "power_anklet": "poweranklet",
    "vigor_restorer": "vigorrestorer"
  }'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_missions := v_save_data -> 'daycare_missions';

    IF v_missions IS NOT NULL AND jsonb_typeof(v_missions) = 'array' THEN
      v_new_missions := '[]'::jsonb;
      FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions) LOOP
        v_reward := v_mission -> 'reward';
        IF v_reward IS NOT NULL AND jsonb_typeof(v_reward) = 'object' THEN
          v_item_id := v_reward ->> 'id';
          IF v_item_id IS NOT NULL THEN
            v_key := lower(v_item_id);
            v_new_item_id := v_item_map ->> v_key;
            IF v_new_item_id IS NOT NULL THEN
              v_reward := jsonb_set(v_reward, '{id}', to_jsonb(v_new_item_id));
              v_mission := jsonb_set(v_mission, '{reward}', v_reward);
            END IF;
          END IF;
        END IF;
        v_new_missions := v_new_missions || v_mission;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{daycare_missions}', v_new_missions);

      UPDATE public.game_saves
      SET save_data = v_save_data
      WHERE user_id = r.user_id;
    END IF;
  END LOOP;

  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260907020000'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
