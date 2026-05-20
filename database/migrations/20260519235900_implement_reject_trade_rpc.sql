-- =====================================================
-- IMPLEMENT reject_trade_v2 RPC FOR REFUNDS
-- Fecha: 2026-05-19
-- =====================================================

CREATE OR REPLACE FUNCTION public.reject_trade_v2(
  p_trade_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
  item_key TEXT;
  item_val TEXT;
  item_qty INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;

  -- Bloquear trade
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Oferta no encontrada.'; END IF;
  
  -- Verificar que el trade está pendiente
  IF v_trade.status != 'pending' THEN
    RAISE EXCEPTION 'Solo se pueden rechazar u ocultar ofertas pendientes.';
  END IF;

  -- Verificar autorización: el llamador debe ser el sender (cancelación) o receiver (rechazo)
  IF v_trade.sender_id != v_caller_id AND v_trade.receiver_id != v_caller_id THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  -- Devolver activos al emisor (sender_id) en su claim_queue
  IF v_trade.offer_pokemon IS NOT NULL THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_trade.sender_id, 'trade_refund', p_trade_id, jsonb_build_object('type', 'pokemon', 'data', v_trade.offer_pokemon));
  END IF;

  IF v_trade.offer_money > 0 THEN
    INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
    VALUES (v_trade.sender_id, 'trade_refund', p_trade_id, jsonb_build_object('type', 'money', 'data', v_trade.offer_money));
  END IF;

  IF v_trade.offer_items IS NOT NULL AND v_trade.offer_items != '{}'::jsonb THEN
    FOR item_key, item_val IN SELECT * FROM jsonb_each_text(v_trade.offer_items) LOOP
      item_qty := item_val::INT;
      IF item_qty > 0 THEN
        INSERT INTO claim_queue (user_id, source_type, source_id, asset_data)
        VALUES (v_trade.sender_id, 'trade_refund', p_trade_id, jsonb_build_object('type', 'item', 'data', jsonb_build_object('name', item_key, 'qty', item_qty)));
      END IF;
    END LOOP;
  END IF;

  -- Marcar como rechazado
  UPDATE trade_offers SET status = 'rejected', updated_at = NOW() WHERE id = p_trade_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Asegurar privilegios
REVOKE EXECUTE ON FUNCTION public.reject_trade_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_trade_v2(uuid) TO authenticated, service_role;

-- Actualizar versión de la base de datos
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260519235900'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
