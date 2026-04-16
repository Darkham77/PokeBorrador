-- =====================================================
-- SISTEMA DE DOMINANCIA — Poké Vicio
-- Versión segura: usa IF NOT EXISTS y OR REPLACE
-- Podés ejecutar esto múltiples veces sin errores
-- =====================================================

-- Bando de cada jugador
CREATE TABLE IF NOT EXISTS war_factions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Puntos de territorio acumulados por semana
-- week_id = string tipo "2026-W14" (año-semana ISO)
CREATE TABLE IF NOT EXISTS war_points (
  id BIGSERIAL PRIMARY KEY,
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (week_id, map_id, faction)
);

-- Resultado de dominancia por semana
CREATE TABLE IF NOT EXISTS war_dominance (
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  winner_faction TEXT NOT NULL CHECK (winner_faction IN ('union', 'poder')),
  union_points INTEGER DEFAULT 0,
  poder_points INTEGER DEFAULT 0,
  resolved_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (week_id, map_id)
);

-- Registro del Guardián capturado por mapa/día
CREATE TABLE IF NOT EXISTS guardian_captures (
  capture_date DATE NOT NULL,
  map_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  winner_faction TEXT NOT NULL,
  pts_awarded INTEGER NOT NULL DEFAULT 150,
  captured_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (capture_date, map_id, user_id)
);

-- Monedas de guerra acumuladas históricamente
CREATE TABLE IF NOT EXISTS war_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas (idempotente)
ALTER TABLE war_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_dominance ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_coins ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta (DROP IF EXISTS para evitar duplicados)
DROP POLICY IF EXISTS "Lectura pública" ON war_factions;
DROP POLICY IF EXISTS "Lectura pública" ON war_points;
DROP POLICY IF EXISTS "Lectura pública" ON war_dominance;
DROP POLICY IF EXISTS "Lectura pública" ON guardian_captures;

CREATE POLICY "Lectura pública" ON war_factions FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_points FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_dominance FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON guardian_captures FOR SELECT USING (true);

-- Políticas de escritura (DROP IF EXISTS para evitar duplicados)
DROP POLICY IF EXISTS "Insert propio" ON war_factions;
DROP POLICY IF EXISTS "Update propio" ON war_factions;
DROP POLICY IF EXISTS "Upsert autenticado" ON war_points;
DROP POLICY IF EXISTS "Update autenticado" ON war_points;
DROP POLICY IF EXISTS "Insert autenticado" ON guardian_captures;
DROP POLICY IF EXISTS "Lectura propia monedas" ON war_coins;
DROP POLICY IF EXISTS "Upsert propio monedas" ON war_coins;
DROP POLICY IF EXISTS "Update propio monedas" ON war_coins;

CREATE POLICY "Insert propio" ON war_factions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio" ON war_factions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Upsert autenticado" ON war_points FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update autenticado" ON war_points FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Insert autenticado" ON guardian_captures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Lectura propia monedas" ON war_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Upsert propio monedas" ON war_coins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio monedas" ON war_coins FOR UPDATE USING (auth.uid() = user_id);

-- Función RPC para sumar puntos atómicamente (CREATE OR REPLACE = seguro siempre)
CREATE OR REPLACE FUNCTION add_war_points(
  p_week_id TEXT, p_map_id TEXT, p_faction TEXT, p_points INTEGER
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO war_points (week_id, map_id, faction, points)
  VALUES (p_week_id, p_map_id, p_faction, p_points)
  ON CONFLICT (week_id, map_id, faction)
  DO UPDATE SET points = war_points.points + p_points, updated_at = NOW();
END;
$$;
