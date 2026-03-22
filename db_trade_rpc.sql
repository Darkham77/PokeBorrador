-- Supabase SQL Script to fix Trade Duplication & RLS Errors
-- Run this script in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id UUID,
  p_receiver_save JSONB,
  p_sender_save JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Basic JSON validations to prevent malicious clients from wiping a save file
  IF p_receiver_save IS NULL OR p_sender_save IS NULL THEN
    RAISE EXCEPTION 'Los datos de guardado no pueden ser nulos.';
  END IF;

  IF NOT (p_receiver_save ? 'team') OR NOT (p_sender_save ? 'team') THEN
    RAISE EXCEPTION 'Los datos de guardado son inválidos (falta el equipo).';
  END IF;

  -- Lock the trade offer row exclusively to prevent concurrent acceptances (race condition duplication)
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

  -- Bypassing RLS internally to safely update both game_saves concurrently:
  -- Update the SENDER save:
  UPDATE game_saves 
  SET save_data = p_sender_save, updated_at = NOW() 
  WHERE user_id = v_trade.sender_id;

  -- Update the RECEIVER (caller) save:
  UPDATE game_saves 
  SET save_data = p_receiver_save, updated_at = NOW() 
  WHERE user_id = v_caller_id;
  
  -- Set status to accepted so the sender can claim it without duplicates
  UPDATE trade_offers 
  SET status = 'accepted' 
  WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
