-- =====================================================
-- RESET FRIENDSHIP ON CLAIM ASSET IN claim_asset_v2
-- Fecha: 2026-08-30
-- check: { "table": "claim_queue", "column": "id" }
-- =====================================================

CREATE OR REPLACE FUNCTION public.claim_asset_v2(
  p_claim_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_claim RECORD;
  v_save JSONB;
  v_new_save JSONB;
  v_item_name TEXT;
  v_qty INT;
  v_curr_qty INT;
  v_pokemon_data JSONB;
BEGIN
  v_caller_id := auth.uid();
  
  -- Bloquear y obtener claim
  SELECT * INTO v_claim FROM claim_queue WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reclamo no encontrado.'; END IF;
  IF v_claim.user_id != v_caller_id THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear save
  SELECT save_data INTO v_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;
  v_new_save := v_save;

  -- Inyectar activo según tipo
  CASE v_claim.asset_data->>'type'
    WHEN 'pokemon' THEN
      -- Restablecer la amistad al valor canónico base (70) al transferir a un nuevo entrenador
      v_pokemon_data := jsonb_set(v_claim.asset_data->'data', '{friendship}', '70'::jsonb);

      -- Si el equipo tiene menos de 6, añadir al equipo, de lo contrario a la caja
      IF jsonb_array_length(v_new_save->'team') < 6 THEN
        v_new_save := jsonb_set(v_new_save, '{team}', (v_new_save->'team') || jsonb_build_array(v_pokemon_data));
      ELSE
        v_new_save := jsonb_set(v_new_save, '{box}', COALESCE(v_new_save->'box', '[]'::jsonb) || jsonb_build_array(v_pokemon_data));
      END IF;
    WHEN 'money' THEN
      v_new_save := jsonb_set(v_new_save, '{money}', to_jsonb((v_new_save->>'money')::BIGINT + (v_claim.asset_data->'data')::BIGINT));
    WHEN 'item' THEN
      v_item_name := v_claim.asset_data->'data'->>'name';
      v_qty := COALESCE((v_claim.asset_data->'data'->>'qty')::INT, 1);
      
      -- Asegurar que existe la propiedad inventory en el JSON
      IF NOT (v_new_save ? 'inventory') OR v_new_save->'inventory' IS NULL THEN
        v_new_save := jsonb_set(v_new_save, '{inventory}', '{}'::jsonb);
      END IF;
      
      -- Obtener cantidad actual del item
      v_curr_qty := COALESCE((v_new_save->'inventory'->>v_item_name)::INT, 0);
      
      -- Actualizar el inventario
      v_new_save := jsonb_set(
        v_new_save, 
        ARRAY['inventory', v_item_name], 
        to_jsonb(v_curr_qty + v_qty)
      );
  END CASE;

  -- Persistir
  UPDATE game_saves SET save_data = v_new_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_caller_id;

  -- Eliminar de la cola
  DELETE FROM claim_queue WHERE id = p_claim_id;

  RETURN v_new_save;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Asegurar privilegios
REVOKE EXECUTE ON FUNCTION public.claim_asset_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_asset_v2(uuid) TO authenticated, service_role;

-- Actualizar versión de la base de datos
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830000000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
