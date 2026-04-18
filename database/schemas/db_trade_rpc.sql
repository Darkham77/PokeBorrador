-- =====================================================
-- MODERN TRADE SYSTEM (v2) — ESCROW & CLAIM QUEUE
-- Baseline Schema & RPCs
-- =====================================================

-- 1. RPC: Enviar Oferta con Escrow (Quita activos del emisor inmediatamente)
CREATE OR REPLACE FUNCTION send_trade_offer_v2(
  p_receiver_id UUID,
  p_offer_pokemon JSONB,
  p_offer_items JSONB,
  p_offer_money BIGINT,
  p_request_pokemon JSONB,
  p_request_items JSONB,
  p_request_money BIGINT,
  p_message TEXT
) RETURNS UUID AS $$
DECLARE
  v_sender_id UUID;
  v_save JSONB;
  v_new_save JSONB;
  v_trade_id UUID;
  v_p_uid TEXT;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear save para evitar carreras
  SELECT save_data INTO v_save FROM game_saves WHERE user_id = v_sender_id FOR UPDATE;
  
  v_new_save := v_save;

  -- 1. Validar y Quitar Pokémon Ofrecido
  IF p_offer_pokemon IS NOT NULL THEN
    v_p_uid := p_offer_pokemon->>'uid';
    -- Quitar de team
    v_new_save := jsonb_set(
      v_new_save, '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_save->'team') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
    );
    -- Si no estaba en team, probar en box
    IF jsonb_array_length(v_new_save->'team') = jsonb_array_length(v_save->'team') THEN
      v_new_save := jsonb_set(
        v_new_save, '{box}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_save->'box') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
      );
      IF jsonb_array_length(v_new_save->'box') = jsonb_array_length(v_save->'box') THEN
        RAISE EXCEPTION 'Pokémon no encontrado en tu inventario.';
      END IF;
    END IF;
  END IF;

  -- 2. Validar y Quitar Dinero
  IF (v_new_save->>'money')::BIGINT < p_offer_money THEN
    RAISE EXCEPTION 'Dinero insuficiente.';
  END IF;
  v_new_save := jsonb_set(v_new_save, '{money}', to_jsonb((v_new_save->>'money')::BIGINT - p_offer_money));

  -- 3. Persistir Cambio en Save (Escrow completado)
  UPDATE game_saves SET save_data = v_new_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_sender_id;

  -- 4. Crear Oferta
  INSERT INTO trade_offers (
    sender_id, receiver_id, 
    offer_pokemon, offer_items, offer_money, 
    request_pokemon, request_items, request_money, 
    message, status
  ) VALUES (
    v_sender_id, p_receiver_id,
    p_offer_pokemon, p_offer_items, p_offer_money,
    p_request_pokemon, p_request_items, p_request_money,
    p_message, 'pending'
  ) RETURNING id INTO v_trade_id;

  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: Aceptar Oferta (Quita activos del receptor y mueve todo a claim_queue)
CREATE OR REPLACE FUNCTION accept_trade_v2(
  p_trade_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
  v_receiver_save JSONB;
  v_new_receiver_save JSONB;
  v_r_uid TEXT;
BEGIN
  v_caller_id := auth.uid();
  
  -- Bloquear trade
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  IF NOT FOUND OR v_trade.status != 'pending' THEN RAISE EXCEPTION 'Oferta no válida o ya procesada.'; END IF;
  IF v_trade.receiver_id != v_caller_id THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear save del receptor
  SELECT save_data INTO v_receiver_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;
  v_new_receiver_save := v_receiver_save;

  -- 1. Validar y Quitar lo que el receptor ofrece (request del trade)
  IF v_trade.request_pokemon IS NOT NULL THEN
    v_r_uid := v_trade.request_pokemon->>'uid';
    v_new_receiver_save := jsonb_set(
      v_new_receiver_save, '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_receiver_save->'team') p WHERE p->>'uid' != v_r_uid), '[]'::jsonb)
    );
     IF jsonb_array_length(v_new_receiver_save->'team') = jsonb_array_length(v_receiver_save->'team') THEN
      v_new_receiver_save := jsonb_set(
        v_new_receiver_save, '{box}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_receiver_save->'box') p WHERE p->>'uid' != v_r_uid), '[]'::jsonb)
      );
    END IF;
  END IF;

  IF (v_new_receiver_save->>'money')::BIGINT < v_trade.request_money THEN
    RAISE EXCEPTION 'Dinero insuficiente para aceptar el intercambio.';
  END IF;
  v_new_receiver_save := jsonb_set(v_new_receiver_save, '{money}', to_jsonb((v_new_receiver_save->>'money')::BIGINT - v_trade.request_money));

  -- 2. Persistir cambio en save del receptor
  UPDATE game_saves SET save_data = v_new_receiver_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_caller_id;

  -- 3. Mover activos a la COLA DE RECLAMO
  -- Lo que el emisor ofreció va al receptor
  IF v_trade.offer_pokemon IS NOT NULL THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_caller_id, 'trade', p_trade_id, jsonb_build_object('type', 'pokemon', 'data', v_trade.offer_pokemon));
  END IF;
  IF v_trade.offer_money > 0 THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_caller_id, 'trade', p_trade_id, jsonb_build_object('type', 'money', 'data', v_trade.offer_money));
  END IF;

  -- Lo que el receptor ofreció va al emisor
  IF v_trade.request_pokemon IS NOT NULL THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_trade.sender_id, 'trade', p_trade_id, jsonb_build_object('type', 'pokemon', 'data', v_trade.request_pokemon));
  END IF;
  IF v_trade.request_money > 0 THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_trade.sender_id, 'trade', p_trade_id, jsonb_build_object('type', 'money', 'data', v_trade.request_money));
  END IF;

  -- 4. Finalizar trade
  UPDATE trade_offers SET status = 'accepted', updated_at = NOW() WHERE id = p_trade_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Reclamar Activo de la Cola
CREATE OR REPLACE FUNCTION claim_asset_v2(
  p_claim_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_claim RECORD;
  v_save JSONB;
  v_new_save JSONB;
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
      v_new_save := jsonb_set(v_new_save, '{team}', (v_new_save->'team') || jsonb_build_array(v_claim.asset_data->'data'));
    WHEN 'money' THEN
      v_new_save := jsonb_set(v_new_save, '{money}', to_jsonb((v_new_save->>'money')::BIGINT + (v_claim.asset_data->'data')::BIGINT));
    WHEN 'item' THEN
      -- Lógica de items...
      v_new_save := jsonb_set(
        v_new_save, 
        ARRAY['inventory', v_claim.asset_data->'data'->>'name'], 
        to_jsonb(COALESCE((v_new_save->'inventory'->>(v_claim.asset_data->'data'->>'name'))::INT, 0) + (v_claim.asset_data->'data'->>'qty')::INT)
      );
  END CASE;

  -- Persistir
  UPDATE game_saves SET save_data = v_new_save, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = v_caller_id;

  -- Eliminar de la cola
  DELETE FROM claim_queue WHERE id = p_claim_id;

  RETURN v_new_save;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
