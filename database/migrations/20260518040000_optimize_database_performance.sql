-- =====================================================
-- DATABASE PERFORMANCE & SECURITY OPTIMIZATION
-- Fecha: 2026-05-18
-- Descripción: 
--  1. Corrige advertencias 'auth_rls_initplan' envolviendo auth.uid() y auth.role() en (select auth.uid()) / (select auth.role())
--  2. Elimina redundancia 'multiple_permissive_policies' en daycare_slots, daycare_upgrades, ranked_queue, war_defenders y profiles
--  3. Añade índices de cobertura para claves foráneas no indexadas (unindexed_foreign_keys)
-- =====================================================

-- -----------------------------------------------------
-- 1. INDEXACIÓN DE CLAVES FORÁNEAS (unindexed_foreign_keys)
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_awards_winner_id ON public.awards(winner_id);

CREATE INDEX IF NOT EXISTS idx_battle_invites_challenger_id ON public.battle_invites(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battle_invites_opponent_id ON public.battle_invites(opponent_id);
CREATE INDEX IF NOT EXISTS idx_battle_invites_sender_id ON public.battle_invites(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages("senderId");

CREATE INDEX IF NOT EXISTS idx_competition_entries_player_id ON public.competition_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_competition_results_event_id ON public.competition_results(event_id);

CREATE INDEX IF NOT EXISTS idx_daycare_slots_player_id ON public.daycare_slots(player_id);
CREATE INDEX IF NOT EXISTS idx_eggs_player_id ON public.eggs(player_id);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);

CREATE INDEX IF NOT EXISTS idx_global_chat_messages_user_id ON public.global_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_captures_user_id ON public.guardian_captures(user_id);

CREATE INDEX IF NOT EXISTS idx_market_listings_buyer_id ON public.market_listings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON public.market_listings(seller_id);

CREATE INDEX IF NOT EXISTS idx_passive_battle_reports_opponent_id ON public.passive_battle_reports(opponent_id);
CREATE INDEX IF NOT EXISTS idx_passive_battle_reports_user_id ON public.passive_battle_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_pokedex_entries_player_id ON public.pokedex_entries(player_id);

CREATE INDEX IF NOT EXISTS idx_trade_offers_receiver_id ON public.trade_offers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_sender_id ON public.trade_offers(sender_id);

CREATE INDEX IF NOT EXISTS idx_war_defenders_user_id ON public.war_defenders(user_id);

-- -----------------------------------------------------
-- 2. REESTRUCTURACIÓN Y MEJORA DE RLS POLICIES
-- -----------------------------------------------------

-- 2.1 public.profiles
DROP POLICY IF EXISTS "Users can update their own session_id" ON public.profiles;
DROP POLICY IF EXISTS "Insertar propio perfil" ON public.profiles;
CREATE POLICY "Insertar propio perfil" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Actualizar propio perfil" ON public.profiles;
CREATE POLICY "Actualizar propio perfil" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- 2.2 public.game_saves
DROP POLICY IF EXISTS "Lectura propia y amigos" ON public.game_saves;
CREATE POLICY "Lectura propia y amigos" ON public.game_saves FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Insertar propio guardado" ON public.game_saves;
CREATE POLICY "Insertar propio guardado" ON public.game_saves FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Actualizar propio guardado" ON public.game_saves;
CREATE POLICY "Actualizar propio guardado" ON public.game_saves FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- 2.3 public.pokedex_entries
DROP POLICY IF EXISTS "Insertar propia pokedex" ON public.pokedex_entries;
CREATE POLICY "Insertar propia pokedex" ON public.pokedex_entries FOR INSERT WITH CHECK ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Actualizar propia pokedex" ON public.pokedex_entries;
CREATE POLICY "Actualizar propia pokedex" ON public.pokedex_entries FOR UPDATE USING ((select auth.uid()) = player_id) WITH CHECK ((select auth.uid()) = player_id);

-- 2.4 public.eggs
DROP POLICY IF EXISTS "Lectura propia de huevos" ON public.eggs;
CREATE POLICY "Lectura propia de huevos" ON public.eggs FOR SELECT USING ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Insertar propio huevo" ON public.eggs;
CREATE POLICY "Insertar propio huevo" ON public.eggs FOR INSERT WITH CHECK ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Actualizar propio huevo" ON public.eggs;
CREATE POLICY "Actualizar propio huevo" ON public.eggs FOR UPDATE USING ((select auth.uid()) = player_id) WITH CHECK ((select auth.uid()) = player_id);

-- 2.5 public.daycare_slots (Consolida Lectura y Modificación en una sola política para evitar multiple_permissive_policies)
DROP POLICY IF EXISTS "Lectura propia daycare_slots" ON public.daycare_slots;
DROP POLICY IF EXISTS "Modificación propia daycare_slots" ON public.daycare_slots;
CREATE POLICY "Modificación propia daycare_slots" ON public.daycare_slots FOR ALL USING ((select auth.uid()) = player_id);

-- 2.6 public.daycare_upgrades (Consolida en una sola política para evitar multiple_permissive_policies)
DROP POLICY IF EXISTS "Lectura propia daycare_upgrades" ON public.daycare_upgrades;
DROP POLICY IF EXISTS "Modificación propia daycare_upgrades" ON public.daycare_upgrades;
CREATE POLICY "Modificación propia daycare_upgrades" ON public.daycare_upgrades FOR ALL USING ((select auth.uid()) = player_id);

-- 2.7 public.trade_offers
DROP POLICY IF EXISTS "Lectura propia de ofertas" ON public.trade_offers;
CREATE POLICY "Lectura propia de ofertas" ON public.trade_offers FOR SELECT USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Insertar propia oferta" ON public.trade_offers;
CREATE POLICY "Insertar propia oferta" ON public.trade_offers FOR INSERT WITH CHECK ((select auth.uid()) = sender_id);

-- 2.8 public.claim_queue
DROP POLICY IF EXISTS "Lectura propia de cola de reclamos" ON public.claim_queue;
CREATE POLICY "Lectura propia de cola de reclamos" ON public.claim_queue FOR SELECT USING ((select auth.uid()) = user_id);

-- 2.9 public.battle_invites
DROP POLICY IF EXISTS "Lectura propia battle_invites" ON public.battle_invites;
CREATE POLICY "Lectura propia battle_invites" ON public.battle_invites 
  FOR SELECT USING ((select auth.uid()) = sender_id OR (select auth.uid()) = challenger_id OR (select auth.uid()) = opponent_id);

DROP POLICY IF EXISTS "Insertar propia battle_invites" ON public.battle_invites;
CREATE POLICY "Insertar propia battle_invites" ON public.battle_invites 
  FOR INSERT WITH CHECK ((select auth.uid()) = sender_id OR (select auth.uid()) = challenger_id);

DROP POLICY IF EXISTS "Actualizar propia battle_invites" ON public.battle_invites;
CREATE POLICY "Actualizar propia battle_invites" ON public.battle_invites 
  FOR UPDATE USING ((select auth.uid()) = sender_id OR (select auth.uid()) = challenger_id OR (select auth.uid()) = opponent_id);

-- 2.10 public.ranked_queue (Evita multiple_permissive_policies dividiendo FOR SELECT y DML)
DROP POLICY IF EXISTS "Lectura pública ranked_queue" ON public.ranked_queue;
CREATE POLICY "Lectura pública ranked_queue" ON public.ranked_queue FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificación propia ranked_queue" ON public.ranked_queue;
DROP POLICY IF EXISTS "Modificación propia ranked_queue_write" ON public.ranked_queue;
CREATE POLICY "Modificación propia ranked_queue_write" ON public.ranked_queue FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modificación propia ranked_queue_update" ON public.ranked_queue;
CREATE POLICY "Modificación propia ranked_queue_update" ON public.ranked_queue FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modificación propia ranked_queue_delete" ON public.ranked_queue;
CREATE POLICY "Modificación propia ranked_queue_delete" ON public.ranked_queue FOR DELETE USING ((select auth.uid()) = user_id);

-- 2.11 public.passive_battle_reports
DROP POLICY IF EXISTS "Lectura propia de reportes" ON public.passive_battle_reports;
CREATE POLICY "Lectura propia de reportes" ON public.passive_battle_reports FOR SELECT USING ((select auth.uid()) = user_id OR (select auth.uid()) = opponent_id);

DROP POLICY IF EXISTS "Insertar propios reportes" ON public.passive_battle_reports;
CREATE POLICY "Insertar propios reportes" ON public.passive_battle_reports FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- 2.12 public.war_defenders (Evita multiple_permissive_policies dividiendo FOR SELECT y DML)
DROP POLICY IF EXISTS "Lectura pública de defensores" ON public.war_defenders;
CREATE POLICY "Lectura pública de defensores" ON public.war_defenders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificación propia de defensores" ON public.war_defenders;
DROP POLICY IF EXISTS "Modificación propia de defensores_insert" ON public.war_defenders;
CREATE POLICY "Modificación propia de defensores_insert" ON public.war_defenders FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modificación propia de defensores_update" ON public.war_defenders;
CREATE POLICY "Modificación propia de defensores_update" ON public.war_defenders FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modificación propia de de defensores_delete" ON public.war_defenders;
DROP POLICY IF EXISTS "Modificación propia de defensores_delete" ON public.war_defenders;
CREATE POLICY "Modificación propia de defensores_delete" ON public.war_defenders FOR DELETE USING ((select auth.uid()) = user_id);

-- 2.13 public.friendships
DROP POLICY IF EXISTS "Lectura propia de amistades" ON public.friendships;
CREATE POLICY "Lectura propia de amistades" ON public.friendships FOR SELECT USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

DROP POLICY IF EXISTS "Insertar propia amistad" ON public.friendships;
CREATE POLICY "Insertar propia amistad" ON public.friendships FOR INSERT WITH CHECK ((select auth.uid()) = requester_id);

DROP POLICY IF EXISTS "Actualizar propia amistad" ON public.friendships;
CREATE POLICY "Actualizar propia amistad" ON public.friendships FOR UPDATE USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

DROP POLICY IF EXISTS "Eliminar propia amistad" ON public.friendships;
CREATE POLICY "Eliminar propia amistad" ON public.friendships FOR DELETE USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

-- 2.14 public.chat_messages
DROP POLICY IF EXISTS "Lectura para usuarios autenticados chat_messages" ON public.chat_messages;
CREATE POLICY "Lectura para usuarios autenticados chat_messages" ON public.chat_messages FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Insertar propio chat_messages" ON public.chat_messages;
CREATE POLICY "Insertar propio chat_messages" ON public.chat_messages FOR INSERT WITH CHECK ((select auth.uid()) = "senderId");

-- 2.15 public.awards
DROP POLICY IF EXISTS "Players can view own awards" ON public.awards;
CREATE POLICY "Players can view own awards" ON public.awards FOR SELECT USING ((select auth.uid()) = winner_id);

DROP POLICY IF EXISTS "Players can update own awards" ON public.awards;
CREATE POLICY "Players can update own awards" ON public.awards FOR UPDATE USING ((select auth.uid()) = winner_id);

-- 2.16 public.competition_entries
DROP POLICY IF EXISTS "Players can enter" ON public.competition_entries;
CREATE POLICY "Players can enter" ON public.competition_entries FOR INSERT WITH CHECK ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Players can update own entries" ON public.competition_entries;
CREATE POLICY "Players can update own entries" ON public.competition_entries FOR UPDATE USING ((select auth.uid()) = player_id);

-- 2.17 public.global_chat_messages
DROP POLICY IF EXISTS "global_chat_insert_self" ON public.global_chat_messages;
CREATE POLICY "global_chat_insert_self" ON public.global_chat_messages FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = user_id AND trainer_level >= 10);

-- 2.18 public.guardian_captures
DROP POLICY IF EXISTS "Insert autenticado" ON public.guardian_captures;
CREATE POLICY "Insert autenticado" ON public.guardian_captures FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- 2.19 public.war_factions
DROP POLICY IF EXISTS "Insert propio" ON public.war_factions;
CREATE POLICY "Insert propio" ON public.war_factions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Update propio" ON public.war_factions;
CREATE POLICY "Update propio" ON public.war_factions FOR UPDATE USING ((select auth.uid()) = user_id);

-- 2.20 public.war_points
DROP POLICY IF EXISTS "Upsert autenticado" ON public.war_points;
CREATE POLICY "Upsert autenticado" ON public.war_points FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Update autenticado" ON public.war_points;
CREATE POLICY "Update autenticado" ON public.war_points FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- -----------------------------------------------------
-- 3. ACTUALIZACIÓN DE VERSIÓN DE BASE DE DATOS
-- -----------------------------------------------------
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518040000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
