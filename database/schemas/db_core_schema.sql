
-- =====================================================
-- CONFIGURACIÓN DEL SISTEMA (SYSTEM) — Poké Vicio
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  gender TEXT DEFAULT 'h',
  role TEXT DEFAULT 'user',
  elo_rating INTEGER DEFAULT 1000,
  pvp_wins INTEGER DEFAULT 0,
  pvp_losses INTEGER DEFAULT 0,
  pvp_draws INTEGER DEFAULT 0,
  badges INTEGER DEFAULT 0,
  current_session_id TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 4. RPC: Tiempo del Servidor
-- Proporciona una fuente de tiempo inmutable para sincronizar misiones y eventos.
CREATE OR REPLACE FUNCTION fn_get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT now();
$$;

-- =====================================================
-- CONTROLES DE SEGURIDAD (RLS, POLÍTICAS Y PRIVILEGIOS)
-- =====================================================

-- 1. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para profiles
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar propio perfil" ON public.profiles;
CREATE POLICY "Insertar propio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Actualizar propio perfil" ON public.profiles;
CREATE POLICY "Actualizar propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Políticas para game_saves
DROP POLICY IF EXISTS "Lectura propia y amigos" ON public.game_saves;
CREATE POLICY "Lectura propia y amigos" ON public.game_saves FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Insertar propio guardado" ON public.game_saves;
CREATE POLICY "Insertar propio guardado" ON public.game_saves FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Actualizar propio guardado" ON public.game_saves;
CREATE POLICY "Actualizar propio guardado" ON public.game_saves FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Políticas para system_config
DROP POLICY IF EXISTS "Lectura pública system_config" ON public.system_config;
CREATE POLICY "Lectura pública system_config" ON public.system_config FOR SELECT USING (true);

-- 5. Privilegios de ejecución RPC
REVOKE EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) TO authenticated;

-- 6. Ocultar tablas del esquema GraphQL
COMMENT ON TABLE public.system_config IS '@graphql(name: "hidden")';
