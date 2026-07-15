-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: CORRECCIÓN DE FÓSILES Y OTROS ÍTEMS CON GUION BAJO (PostgreSQL)
-- Fecha: 2026-07-14
-- Descripción: Corrección de IDs de fósiles y otros ítems con guión bajo restantes en los inventarios,
--              equipos y cajas de las partidas guardadas en la nube.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_inventory JSONB;
  v_new_inventory JSONB;
  v_team JSONB;
  v_new_team JSONB;
  v_box JSONB;
  v_new_box JSONB;
  v_poke JSONB;
  v_inv_key TEXT;
  v_inv_val INT;
  v_clean_key TEXT;
  v_item TEXT;
  v_official_keys JSONB;
BEGIN
  v_official_keys := '{
    "old_amber": "oldamber",
    "helix_fossil": "helixfossil",
    "dome_fossil": "domefossil",
    "brush_super": "brushsuper",
    "brush_good": "brushgood",
    "spell_tag": "spelltag",
    "light_ball": "lightball",
    "thick_club": "thickclub"
  }'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_inventory := v_save_data -> 'inventory';

    IF v_inventory IS NOT NULL AND jsonb_typeof(v_inventory) = 'object' THEN
      v_new_inventory := '{}'::jsonb;
      FOR v_inv_key, v_inv_val IN SELECT * FROM jsonb_each_text(v_inventory) LOOP
        v_clean_key := v_official_keys ->> v_inv_key;
        IF v_clean_key IS NULL THEN
          v_clean_key := v_inv_key;
        END IF;

        IF v_new_inventory ->> v_clean_key IS NOT NULL THEN
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb((v_new_inventory ->> v_clean_key)::INTEGER + v_inv_val::INTEGER));
        ELSE
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb(v_inv_val::INTEGER));
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{inventory}', v_new_inventory);
    END IF;

    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        v_item := v_poke ->> 'heldItem';
        IF v_item IS NOT NULL THEN
          v_clean_key := v_official_keys ->> v_item;
          IF v_clean_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{heldItem}', to_jsonb(v_clean_key));
          END IF;
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        v_item := v_poke ->> 'heldItem';
        IF v_item IS NOT NULL THEN
          v_clean_key := v_official_keys ->> v_item;
          IF v_clean_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{heldItem}', to_jsonb(v_clean_key));
          END IF;
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
  END LOOP;

  UPDATE public.profiles SET db_version = 18;
  ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 18;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260714200000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
