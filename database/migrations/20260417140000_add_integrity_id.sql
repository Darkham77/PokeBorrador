-- =====================================================
-- POKÉ VICIO — CONTROL DE CONCURRENCIA (OCC)
-- Fecha: 2026-04-17
-- Descripción: Implementa last_save_id para evitar desincronizaciones en trades.
-- =====================================================

-- 1. Añadir columna de integridad a game_saves
ALTER TABLE public.game_saves 
ADD COLUMN IF NOT EXISTS last_save_id UUID DEFAULT gen_random_uuid();

-- 2. Función de guardado atómico con validación de versión (OCC)
CREATE OR REPLACE FUNCTION save_game_trusted(
  p_save_data JSONB,
  p_expected_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
  v_current_id UUID;
  v_updated_rows INTEGER;
BEGIN
  -- Obtener ID actual
  SELECT last_save_id INTO v_current_id FROM public.game_saves WHERE user_id = auth.uid() FOR UPDATE;
  
  -- Si no existe partida previa, permitimos el primer guardado
  IF v_current_id IS NULL THEN
    INSERT INTO public.game_saves (user_id, save_data, last_save_id, updated_at)
    VALUES (auth.uid(), p_save_data, v_new_id, NOW());
    RETURN jsonb_build_object('success', true, 'last_save_id', v_new_id);
  END IF;

  -- Validar coincidencia de ID (Optimistic Lock)
  -- Si p_expected_id es NULL, es un guardado forzado o inicial (usar con precaución)
  IF p_expected_id IS NOT NULL AND v_current_id != p_expected_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_SYNC', 'current_id', v_current_id);
  END IF;

  -- Actualizar
  UPDATE public.game_saves 
  SET save_data = p_save_data, last_save_id = v_new_id, updated_at = NOW()
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object('success', true, 'last_save_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar execute_trade para refrescar el last_save_id atómicamente
-- (Esto asegura que el trade invalide cualquier save viejo que tenga el cliente)
-- Nota: Se debe aplicar a la versión actual de execute_trade.
