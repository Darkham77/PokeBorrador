-- =====================================================
-- ESTRUCTURA CENTRAL (CORE) — Poké Vicio
-- Fecha: 2026-04-17 (Sincronizado v2)
-- =====================================================

-- 1. Tabla de Perfiles (profiles)
-- Almacena metadatos del jugador y estado de sesión.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  trainer_level INTEGER DEFAULT 1,
  player_class TEXT,
  faction TEXT,
  nick_style TEXT,
  avatar_style TEXT,
  elo_rating INTEGER DEFAULT 1000,
  current_session_id TEXT,
  db_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Persistencia (game_saves)
-- Contiene el estado serializado del juego con protección OCC.
CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL,
  last_save_id UUID DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RPC: Guardado Confiable (Optimistic Concurrency Control)
-- Esta es la vía oficial para guardar el juego desde el cliente.
CREATE OR REPLACE FUNCTION save_game_trusted(
  p_save_data JSONB,
  p_expected_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
  v_current_id UUID;
BEGIN
  SELECT last_save_id INTO v_current_id FROM public.game_saves WHERE user_id = auth.uid() FOR UPDATE;
  
  -- Permitir primer guardado si es NULO o coincide el ID
  IF v_current_id IS NOT NULL AND p_expected_id IS NOT NULL AND v_current_id != p_expected_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_SYNC', 'current_id', v_current_id);
  END IF;

  INSERT INTO public.game_saves (user_id, save_data, last_save_id, updated_at)
  VALUES (auth.uid(), p_save_data, v_new_id, NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET save_data = EXCLUDED.save_data, last_save_id = EXCLUDED.last_save_id, updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'last_save_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Tiempo del Servidor
-- Proporciona una fuente de tiempo inmutable para sincronizar misiones y eventos.
CREATE OR REPLACE FUNCTION fn_get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;
