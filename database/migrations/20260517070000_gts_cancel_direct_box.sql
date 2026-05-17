-- =====================================================
-- GTS CANCEL DIRECT-TO-BOX & INVENTORY MODERNIZATION
-- Fecha: 2026-05-17
-- =====================================================

DROP FUNCTION IF EXISTS cancel_listing_v2(UUID);

CREATE OR REPLACE FUNCTION cancel_listing_v2(
  p_listing_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_listing RECORD;
  v_save JSONB;
  v_new_save JSONB;
  v_item_name TEXT;
  v_item_qty INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  
  -- Bloquear y obtener publicación
  SELECT * INTO v_listing FROM market_listings WHERE id = p_listing_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada o procesada.'; END IF;
  IF v_listing.seller_id != v_caller_id THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear save del vendedor
  SELECT save_data INTO v_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida guardada no encontrada.'; END IF;
  
  -- Regresar el activo directamente al save
  IF v_listing.listing_type = 'pokemon' THEN
    -- Mover directamente a la caja (box)
    v_new_save := jsonb_set(
      v_save, '{box}', 
      COALESCE(v_save->'box', '[]'::jsonb) || jsonb_build_array(v_listing.data)
    );
  ELSE
    -- Items: Devolver cantidad al inventario
    v_item_name := v_listing.data->>'name';
    v_item_qty := (v_listing.data->>'qty')::INT;
    v_new_save := jsonb_set(
      v_save, 
      ARRAY['inventory', v_item_name], 
      to_jsonb(COALESCE((v_save->'inventory'->>v_item_name')::INT, 0) + v_item_qty)
    );
  END IF;

  -- Persistir Save y actualizar ID de guardado para Last-In-Wins logic
  UPDATE game_saves 
  SET save_data = v_new_save, 
      last_save_id = gen_random_uuid(), 
      updated_at = NOW() 
  WHERE user_id = v_caller_id;

  -- Marcar publicación como cancelada
  UPDATE market_listings 
  SET status = 'cancelled', 
      updated_at = NOW() 
  WHERE id = p_listing_id;

  -- Retornar el save actualizado para sincronización instantánea
  RETURN v_new_save;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar la versión de la base de datos a 20260517070000
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260517070000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
