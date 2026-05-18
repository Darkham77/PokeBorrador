-- =====================================================
-- DATABASE SECURITY: DEFINE MISSING RLS POLICIES
-- Fecha: 2026-05-18
-- Descripción: Define políticas de RLS para las tablas que tenían RLS habilitado pero sin políticas.
-- =====================================================

-- 1. _migrations (Seguridad interna: Mantener por defecto restringido para evitar cualquier consulta externa)
-- No se requiere política de lectura/escritura pública por seguridad. Sin embargo, para quitar el info de Supabase,
-- agregamos una política de lectura exclusiva para el rol de administrador o simplemente la dejamos restringida por seguridad.
-- Dejaremos sin políticas porque _migrations es interna del framework de migración y la advertencia es INFO.

-- 2. awards (Premios y Recompensas de eventos y torneos)
DROP POLICY IF EXISTS "Players can view own awards" ON public.awards;
CREATE POLICY "Players can view own awards" ON public.awards FOR SELECT USING (auth.uid() = winner_id);

DROP POLICY IF EXISTS "Players can update own awards" ON public.awards;
CREATE POLICY "Players can update own awards" ON public.awards FOR UPDATE USING (auth.uid() = winner_id);

-- 3. competition_entries (Participaciones en concursos semanales)
DROP POLICY IF EXISTS "Players can enter" ON public.competition_entries;
CREATE POLICY "Players can enter" ON public.competition_entries FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can update own entries" ON public.competition_entries;
CREATE POLICY "Players can update own entries" ON public.competition_entries FOR UPDATE USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Admin view all entries" ON public.competition_entries;
CREATE POLICY "Admin view all entries" ON public.competition_entries FOR SELECT USING (true);

-- 4. competition_results (Resultados de torneos y podios)
DROP POLICY IF EXISTS "Public read results" ON public.competition_results;
CREATE POLICY "Public read results" ON public.competition_results FOR SELECT USING (true);

-- 5. events_config (Configuraciones de eventos y bonus del servidor)
DROP POLICY IF EXISTS "Public read events" ON public.events_config;
CREATE POLICY "Public read events" ON public.events_config FOR SELECT USING (true);

-- 6. global_chat_messages (Mensajes del chat global persistente del juego)
DROP POLICY IF EXISTS "global_chat_select_all" ON public.global_chat_messages;
CREATE POLICY "global_chat_select_all" ON public.global_chat_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "global_chat_insert_self" ON public.global_chat_messages;
CREATE POLICY "global_chat_insert_self" ON public.global_chat_messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id AND trainer_level >= 10);

-- 7. guardian_captures (Capturas de guardianes semanales en los mapas)
DROP POLICY IF EXISTS "Lectura pública" ON public.guardian_captures;
CREATE POLICY "Lectura pública" ON public.guardian_captures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert autenticado" ON public.guardian_captures;
CREATE POLICY "Insert autenticado" ON public.guardian_captures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. ranked_rules_config (Configuraciones y reglas del emparejamiento PvP)
DROP POLICY IF EXISTS "Lectura pública ranked_rules_config" ON public.ranked_rules_config;
CREATE POLICY "Lectura pública ranked_rules_config" ON public.ranked_rules_config FOR SELECT USING (true);

-- 9. war_dominance (Estado de dominancia semanal por mapa/bando)
DROP POLICY IF EXISTS "Lectura pública" ON public.war_dominance;
CREATE POLICY "Lectura pública" ON public.war_dominance FOR SELECT USING (true);

-- 10. war_factions (Bandos y facciones de cada jugador)
DROP POLICY IF EXISTS "Lectura pública" ON public.war_factions;
CREATE POLICY "Lectura pública" ON public.war_factions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert propio" ON public.war_factions;
CREATE POLICY "Insert propio" ON public.war_factions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update propio" ON public.war_factions;
CREATE POLICY "Update propio" ON public.war_factions FOR UPDATE USING (auth.uid() = user_id);

-- 11. war_points (Puntos semanales acumulados por facción en mapas)
DROP POLICY IF EXISTS "Lectura pública" ON public.war_points;
CREATE POLICY "Lectura pública" ON public.war_points FOR SELECT USING (true);

DROP POLICY IF EXISTS "Upsert autenticado" ON public.war_points;
CREATE POLICY "Upsert autenticado" ON public.war_points FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Update autenticado" ON public.war_points;
CREATE POLICY "Update autenticado" ON public.war_points FOR UPDATE USING (auth.role() = 'authenticated');

-- 12. Actualizar versión de la base de datos
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518020000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
