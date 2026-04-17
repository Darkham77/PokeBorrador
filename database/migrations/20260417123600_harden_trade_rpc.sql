-- Hardened execute_trade RPC to ensure DATA INTEGRITY and NO DUPLICATES
-- Run this in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
  v_sender_save JSONB;
  v_receiver_save JSONB;
  v_sender_id UUID;
  v_new_sender_save JSONB;
  v_new_receiver_save JSONB;
  v_p_uid TEXT;
  v_r_uid TEXT;
BEGIN
  v_caller_id := auth.uid();
  
  -- 1. Fetch and Lock the trade offer
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta de intercambio.';
  END IF;
  
  IF v_trade.status != 'pending' THEN
    RAISE EXCEPTION 'El intercambio ya fue procesado o cancelado.';
  END IF;
  
  IF v_trade.receiver_id != v_caller_id THEN
    RAISE EXCEPTION 'No estás autorizado para aceptar este intercambio.';
  END IF;

  v_sender_id := v_trade.sender_id;

  -- 2. Fetch and LOCK both players saves to ensure ATOMICITY
  SELECT save_data INTO v_sender_save FROM game_saves WHERE user_id = v_sender_id FOR UPDATE;
  SELECT save_data INTO v_receiver_save FROM game_saves WHERE user_id = v_caller_id FOR UPDATE;

  IF v_sender_save IS NULL OR v_receiver_save IS NULL THEN
    RAISE EXCEPTION 'No se encontraron las partidas guardadas de los jugadores.';
  END IF;

  -- 3. VALIDATE SENDER OWNERSHIP & REMOVE
  v_new_sender_save := v_sender_save;
  IF v_trade.offer_pokemon IS NOT NULL THEN
    v_p_uid := v_trade.offer_pokemon->>'uid';
    
    -- Check uniqueness: ensure the receiver doesn't somehow already have this UID
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_receiver_save->'team') p WHERE p->>'uid' = v_p_uid) OR
       EXISTS (SELECT 1 FROM jsonb_array_elements(v_receiver_save->'box') p WHERE p->>'uid' = v_p_uid) THEN
      RAISE EXCEPTION 'El destinatario ya posee este ejemplar (Posible duplicado detectado).';
    END IF;

    -- Remove from sender's team
    v_new_sender_save := jsonb_set(
      v_new_sender_save, 
      '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_sender_save->'team') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
    );
    
    -- If length didn't change, try box
    IF jsonb_array_length(v_new_sender_save->'team') = jsonb_array_length(v_sender_save->'team') THEN
      v_new_sender_save := jsonb_set(
        v_new_sender_save, 
        '{box}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_sender_save->'box') p WHERE p->>'uid' != v_p_uid), '[]'::jsonb)
      );
      IF jsonb_array_length(v_new_sender_save->'box') = jsonb_array_length(v_sender_save->'box') THEN
        RAISE EXCEPTION 'El remitente ya no tiene el Pokémon ofrecido.';
      END IF;
    END IF;
  END IF;

  -- Money check (Sender)
  IF (v_new_sender_save->>'money')::BIGINT < (v_trade.offer_money)::BIGINT THEN
    RAISE EXCEPTION 'El remitente no tiene suficiente dinero.';
  END IF;
  v_new_sender_save := jsonb_set(v_new_sender_save, '{money}', to_jsonb((v_new_sender_save->>'money')::BIGINT - (v_trade.offer_money)::BIGINT));

  -- 4. VALIDATE RECEIVER OWNERSHIP & REMOVE (If not a gift)
  v_new_receiver_save := v_receiver_save;
  IF v_trade.request_pokemon IS NOT NULL THEN
    v_r_uid := v_trade.request_pokemon->>'uid';
    
    -- Ensure sender doesn't already have this UID
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_sender_save->'team') p WHERE p->>'uid' = v_r_uid) OR
       EXISTS (SELECT 1 FROM jsonb_array_elements(v_sender_save->'box') p WHERE p->>'uid' = v_r_uid) THEN
      RAISE EXCEPTION 'El remitente ya posee el ejemplar solicitado.';
    END IF;

    v_new_receiver_save := jsonb_set(
      v_new_receiver_save, 
      '{team}', 
      COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_receiver_save->'team') p WHERE p->>'uid' != v_r_uid), '[]'::jsonb)
    );
    IF jsonb_array_length(v_new_receiver_save->'team') = jsonb_array_length(v_receiver_save->'team') THEN
      -- Try removal from box as well for receiver if allowed (usually trade is from team)
       v_new_receiver_save := jsonb_set(
        v_new_receiver_save, 
        '{box}', 
        COALESCE((SELECT jsonb_agg(p) FROM jsonb_array_elements(v_receiver_save->'box') p WHERE p->>'uid' != v_r_uid), '[]'::jsonb)
      );
      IF jsonb_array_length(v_new_receiver_save->'box') = jsonb_array_length(v_receiver_save->'box') THEN
        RAISE EXCEPTION 'No tenés el Pokémon solicitado.';
      END IF;
    END IF;
  END IF;

  -- Money check (Receiver)
  IF (v_new_receiver_save->>'money')::BIGINT < (v_trade.request_money)::BIGINT THEN
    RAISE EXCEPTION 'No tenés suficiente dinero.';
  END IF;
  v_new_receiver_save := jsonb_set(v_new_receiver_save, '{money}', to_jsonb((v_new_receiver_save->>'money')::BIGINT - (v_trade.request_money)::BIGINT));

  -- 5. PERFORM EXCHANGE (Add to each other)
  -- Add sender's offerings to receiver
  IF v_trade.offer_pokemon IS NOT NULL THEN
    v_new_receiver_save := jsonb_set(v_new_receiver_save, '{team}', (v_new_receiver_save->'team') || jsonb_build_array(v_trade.offer_pokemon));
  END IF;
  v_new_receiver_save := jsonb_set(v_new_receiver_save, '{money}', to_jsonb((v_new_receiver_save->>'money')::BIGINT + (v_trade.offer_money)::BIGINT));

  -- Add receiver's offerings to sender
  IF v_trade.request_pokemon IS NOT NULL THEN
    v_new_sender_save := jsonb_set(v_new_sender_save, '{team}', (v_new_sender_save->'team') || jsonb_build_array(v_trade.request_pokemon));
  END IF;
  v_new_sender_save := jsonb_set(v_new_sender_save, '{money}', to_jsonb((v_new_sender_save->>'money')::BIGINT + (v_trade.request_money)::BIGINT));

  -- 6. FINAL UPDATES (Refreshing Integrity IDs to invalidate old client saves)
  UPDATE game_saves 
  SET save_data = v_new_sender_save, last_save_id = gen_random_uuid(), updated_at = NOW() 
  WHERE user_id = v_sender_id;

  UPDATE game_saves 
  SET save_data = v_new_receiver_save, last_save_id = gen_random_uuid(), updated_at = NOW() 
  WHERE user_id = v_caller_id;

  UPDATE trade_offers SET status = 'accepted', updated_at = NOW() WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
