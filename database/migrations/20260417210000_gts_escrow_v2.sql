-- =====================================================
-- GTS (MARKET) MODERNIZATION — ESCROW & CLAIM QUEUE
-- Fecha: 2026-04-17
-- =====================================================

-- 1. RPC: Publicar con Escrow (Quita activo del vendedor inmediatamente)
CREATE OR REPLACE FUNCTION publish_listing_v2(
  p_listing_type TEXT, -- 'pokemon' o 'item'
  p_asset_data JSONB,
  p_price BIGINT
) RETURNS UUID AS $$
DECLARE
  v_seller_id UUID;
  v_save JSONB;
  v_new_save JSONB;
  v_listing_id UUID;
  v_uid TEXT;
BEGIN
  v_seller_id := auth.uid();
  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear save
  SELECT save_data INTO v_save FROM game_saves WHERE user_id = v_seller_id FOR UPDATE;
  v_new_save := v_save;

  -- Quitar activo del save según tipo
  IF p_listing_type = 'pokemon' THEN
    v_uid := p_asset_data->>'uid';
    v_new_save := jsonb_set(
      v_new_save, '{box}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_save->'box') p WHERE p->>'uid' != v_uid), '[]'::jsonb)
    );
    IF jsonb_array_length(v_new_save->'box') = jsonb_array_length(v_save->'box') THEN
      -- Probar en equipo
      v_new_save := jsonb_set(
        v_new_save, '{team}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_save->'team') p WHERE p->>'uid' != v_uid), '[]'::jsonb)
      );
      IF jsonb_array_length(v_new_save->'team') = jsonb_array_length(v_save->'team') THEN
        RAISE EXCEPTION 'Pokémon no encontrado para publicar.';
      END IF;
    END IF;
  ELSE
    -- Items (Lógica simplificada: se asume que p_asset_data tiene {name, qty})
    IF (v_new_save->'inventory'->>(p_asset_data->>'name'))::INT < (p_asset_data->>'qty')::INT THEN
      RAISE EXCEPTION 'Cantidad insuficiente de objetos.';
    END IF;
    v_new_save := jsonb_set(
      v_new_save, 
      ARRAY['inventory', p_asset_data->>'name'], 
      to_jsonb((v_new_save->'inventory'->>(p_asset_data->>'name'))::INT - (p_asset_data->>'qty')::INT)
    );
  END IF;

  -- Persistir Save
  UPDATE game_saves SET save_data = v_new_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_seller_id;

  -- Insertar Publicación
  INSERT INTO market_listings (
    seller_id, seller_name, listing_type, data, price, status
  ) VALUES (
    v_seller_id, v_new_save->>'trainer', p_listing_type, p_asset_data, p_price, 'active'
  ) RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: Comprar con Escrow (Mueve activos y dinero a colas de reclamo)
CREATE OR REPLACE FUNCTION buy_listing_v2(
  p_listing_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_buyer_id UUID;
  v_listing RECORD;
  v_buyer_save JSONB;
  v_new_buyer_save JSONB;
  v_fee_percent NUMERIC := 0.05;
  v_final_payment BIGINT;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear y obtener publicación
  SELECT * INTO v_listing FROM market_listings WHERE id = p_listing_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La publicación ya no está disponible o fue vendida.'; END IF;
  IF v_listing.seller_id = v_buyer_id THEN RAISE EXCEPTION 'No puedes comprar tu propia oferta.'; END IF;

  -- Bloquear save del comprador
  SELECT save_data INTO v_buyer_save FROM game_saves WHERE user_id = v_buyer_id FOR UPDATE;
  v_new_buyer_save := v_buyer_save;

  -- Validar fondos
  IF (v_new_buyer_save->>'money')::BIGINT < v_listing.price THEN
    RAISE EXCEPTION 'Fondos insuficientes.';
  END IF;

  -- 1. Quitar dinero al comprador
  v_new_buyer_save := jsonb_set(
    v_new_buyer_save, '{money}', 
    to_jsonb((v_new_buyer_save->>'money')::BIGINT - v_listing.price)
  );
  UPDATE game_saves SET save_data = v_new_buyer_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_buyer_id;

  -- 2. Mover ASSET al comprador (Cola de Reclamo)
  INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
  VALUES (
    v_buyer_id, 'gts', p_listing_id, 
    jsonb_build_object('type', CASE WHEN v_listing.listing_type = 'pokemon' THEN 'pokemon' ELSE 'item' END, 'data', v_listing.data)
  );

  -- 3. Mover DINERO al vendedor (Cola de Reclamo)
  v_final_payment := floor(v_listing.price * (1 - v_fee_percent))::BIGINT;
  INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
  VALUES (
    v_listing.seller_id, 'gts', p_listing_id, 
    jsonb_build_object('type', 'money', 'data', v_final_payment)
  );

  -- 4. Marcar como vendido
  UPDATE market_listings SET status = 'sold', buyer_id = v_buyer_id, updated_at = NOW() WHERE id = p_listing_id;

  RETURN v_new_buyer_save;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Cancelar Publicación (Regresa activo a la cola del vendedor)
CREATE OR REPLACE FUNCTION cancel_listing_v2(
  p_listing_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_caller_id UUID;
  v_listing RECORD;
BEGIN
  v_caller_id := auth.uid();
  
  -- Bloquear y obtener publicación
  SELECT * INTO v_listing FROM market_listings WHERE id = p_listing_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada o procesada.'; END IF;
  IF v_listing.seller_id != v_caller_id THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Mover de vuelta a la cola de reclamo
  INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
  VALUES (
    v_caller_id, 'gts_cancel', p_listing_id, 
    jsonb_build_object('type', CASE WHEN v_listing.listing_type = 'pokemon' THEN 'pokemon' ELSE 'item' END, 'data', v_listing.data)
  );

  -- Marcar como cancelado
  UPDATE market_listings SET status = 'cancelled', updated_at = NOW() WHERE id = p_listing_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Establish version 20260417210000
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260417210000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
