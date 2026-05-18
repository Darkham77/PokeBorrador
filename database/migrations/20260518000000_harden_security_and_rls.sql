-- =====================================================
-- DATABASE HARDENING: RLS ENABLING, POLICIES & SECURITY DEFINER FIXES
-- Fecha: 2026-05-18
-- Descripción: Protege la base de datos de Poké Vicio contra inyecciones y accesos no autorizados.
-- =====================================================

-- -----------------------------------------------------
-- 1. HABILITAR RLS EN TODAS LAS TABLAS EXPUESTAS EN PUBLIC
-- -----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokedex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eggs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_defenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_dominance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_rules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passive_battle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daycare_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daycare_upgrades ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 2. DEFINICIÓN DE POLÍTICAS DE RLS REQUERIDAS POR EL CLIENTE
-- -----------------------------------------------------

-- 2.1 Profiles (Lectura libre, escritura e insert restringido al propio ID)
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar propio perfil" ON public.profiles;
CREATE POLICY "Insertar propio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Actualizar propio perfil" ON public.profiles;
CREATE POLICY "Actualizar propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2.2 Game Saves (Lectura para autenticados para permitir ver perfiles/amigos, escritura propia)
DROP POLICY IF EXISTS "Lectura propia y amigos" ON public.game_saves;
CREATE POLICY "Lectura propia y amigos" ON public.game_saves FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Insertar propio guardado" ON public.game_saves;
CREATE POLICY "Insertar propio guardado" ON public.game_saves FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Actualizar propio guardado" ON public.game_saves;
CREATE POLICY "Actualizar propio guardado" ON public.game_saves FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2.3 Pokedex Entries (Lectura libre, escritura propia)
DROP POLICY IF EXISTS "Lectura pública de pokedex" ON public.pokedex_entries;
CREATE POLICY "Lectura pública de pokedex" ON public.pokedex_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar propia pokedex" ON public.pokedex_entries;
CREATE POLICY "Insertar propia pokedex" ON public.pokedex_entries FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Actualizar propia pokedex" ON public.pokedex_entries;
CREATE POLICY "Actualizar propia pokedex" ON public.pokedex_entries FOR UPDATE USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- 2.4 Eggs (Lectura y escritura propia)
DROP POLICY IF EXISTS "Lectura propia de huevos" ON public.eggs;
CREATE POLICY "Lectura propia de huevos" ON public.eggs FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Insertar propio huevo" ON public.eggs;
CREATE POLICY "Insertar propio huevo" ON public.eggs FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Actualizar propio huevo" ON public.eggs;
CREATE POLICY "Actualizar propio huevo" ON public.eggs FOR UPDATE USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- 2.5 Daycare Slots & Upgrades (Lectura y escritura propia)
DROP POLICY IF EXISTS "Lectura propia daycare_slots" ON public.daycare_slots;
CREATE POLICY "Lectura propia daycare_slots" ON public.daycare_slots FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Modificación propia daycare_slots" ON public.daycare_slots;
CREATE POLICY "Modificación propia daycare_slots" ON public.daycare_slots FOR ALL USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Lectura propia daycare_upgrades" ON public.daycare_upgrades;
CREATE POLICY "Lectura propia daycare_upgrades" ON public.daycare_upgrades FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Modificación propia daycare_upgrades" ON public.daycare_upgrades;
CREATE POLICY "Modificación propia daycare_upgrades" ON public.daycare_upgrades FOR ALL USING (auth.uid() = player_id);

-- 2.6 Trade Offers (Lectura para emisor y receptor, inserción propia, actualizaciones vía RPC)
DROP POLICY IF EXISTS "Lectura propia de ofertas" ON public.trade_offers;
CREATE POLICY "Lectura propia de ofertas" ON public.trade_offers FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Insertar propia oferta" ON public.trade_offers;
CREATE POLICY "Insertar propia oferta" ON public.trade_offers FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 2.7 Market Listings (Lectura pública, modificaciones e inserciones vía RPC SECURITY DEFINER)
DROP POLICY IF EXISTS "Lectura pública de mercado" ON public.market_listings;
CREATE POLICY "Lectura pública de mercado" ON public.market_listings FOR SELECT USING (true);

-- 2.8 Claim Queue (Lectura propia, inserciones vía RPC SECURITY DEFINER)
DROP POLICY IF EXISTS "Lectura propia de cola de reclamos" ON public.claim_queue;
CREATE POLICY "Lectura propia de cola de reclamos" ON public.claim_queue FOR SELECT USING (auth.uid() = user_id);

-- 2.9 Battle Invites (Asegurar columna challenger_id y políticas para retos y PvP)
ALTER TABLE public.battle_invites ADD COLUMN IF NOT EXISTS challenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Lectura propia battle_invites" ON public.battle_invites;
CREATE POLICY "Lectura propia battle_invites" ON public.battle_invites 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Insertar propia battle_invites" ON public.battle_invites;
CREATE POLICY "Insertar propia battle_invites" ON public.battle_invites 
  FOR INSERT WITH CHECK (auth.uid() = sender_id OR auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Actualizar propia battle_invites" ON public.battle_invites;
CREATE POLICY "Actualizar propia battle_invites" ON public.battle_invites 
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 2.10 Ranked Queue (Lectura pública para matchmaking, escritura propia)
DROP POLICY IF EXISTS "Lectura pública ranked_queue" ON public.ranked_queue;
CREATE POLICY "Lectura pública ranked_queue" ON public.ranked_queue FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificación propia ranked_queue" ON public.ranked_queue;
CREATE POLICY "Modificación propia ranked_queue" ON public.ranked_queue FOR ALL USING (auth.uid() = user_id);

-- 2.11 Passive Battle Reports (Lectura para jugadores involucrados, escritura del host)
DROP POLICY IF EXISTS "Lectura propia de reportes" ON public.passive_battle_reports;
CREATE POLICY "Lectura propia de reportes" ON public.passive_battle_reports FOR SELECT USING (auth.uid() = user_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Insertar propios reportes" ON public.passive_battle_reports;
CREATE POLICY "Insertar propios reportes" ON public.passive_battle_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2.12 War Defenders (Lectura pública, modificación propia)
DROP POLICY IF EXISTS "Lectura pública de defensores" ON public.war_defenders;
CREATE POLICY "Lectura pública de defensores" ON public.war_defenders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificación propia de defensores" ON public.war_defenders;
CREATE POLICY "Modificación propia de defensores" ON public.war_defenders FOR ALL USING (auth.uid() = user_id);

-- 2.13 Friendships (Lectura y escritura propia)
DROP POLICY IF EXISTS "Lectura propia de amistades" ON public.friendships;
CREATE POLICY "Lectura propia de amistades" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Insertar propia amistad" ON public.friendships;
CREATE POLICY "Insertar propia amistad" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Actualizar propia amistad" ON public.friendships;
CREATE POLICY "Actualizar propia amistad" ON public.friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Eliminar propia amistad" ON public.friendships;
CREATE POLICY "Eliminar propia amistad" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 2.14 System Config (Lectura libre)
DROP POLICY IF EXISTS "Lectura pública system_config" ON public.system_config;
CREATE POLICY "Lectura pública system_config" ON public.system_config FOR SELECT USING (true);

-- 2.15 Chat Messages
DROP POLICY IF EXISTS "Lectura para usuarios autenticados chat_messages" ON public.chat_messages;
CREATE POLICY "Lectura para usuarios autenticados chat_messages" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Insertar propio chat_messages" ON public.chat_messages;
CREATE POLICY "Insertar propio chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = "senderId");

-- -----------------------------------------------------
-- 3. FIJAR SEARCH PATH SEGURO EN FUNCIONES SECURITY DEFINER
-- -----------------------------------------------------
ALTER FUNCTION public.validate_game_save() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trim_global_chat_messages() SET search_path = public, pg_catalog;
ALTER FUNCTION public.execute_trade(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.add_war_points(text, text, text, integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.save_game_trusted(jsonb, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.fn_get_server_time() SET search_path = public, pg_catalog;
ALTER FUNCTION public.send_trade_offer_v2(uuid, jsonb, jsonb, bigint, jsonb, jsonb, bigint, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.accept_trade_v2(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.claim_asset_v2(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.publish_listing_v2(text, jsonb, bigint) SET search_path = public, pg_catalog;
ALTER FUNCTION public.buy_listing_v2(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.cancel_listing_v2(uuid) SET search_path = public, pg_catalog;

-- -----------------------------------------------------
-- 4. CONTROL DE PRIVILEGIOS DE EJECUCIÓN PÚBLICA EN RPCs SENSIBLES
-- -----------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.accept_trade_v2(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.buy_listing_v2(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_listing_v2(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_asset_v2(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publish_listing_v2(text, jsonb, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_trade_offer_v2(uuid, jsonb, jsonb, bigint, jsonb, jsonb, bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.accept_trade_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_listing_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_listing_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_asset_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_listing_v2(text, jsonb, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_trade_offer_v2(uuid, jsonb, jsonb, bigint, jsonb, jsonb, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) TO authenticated;

-- -----------------------------------------------------
-- 5. OCULTAR TABLAS SENSIBLES DEL ESQUEMA GRAPHQL
-- -----------------------------------------------------
COMMENT ON TABLE public._migrations IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.system_config IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.claim_queue IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.ranked_rules_config IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.events_config IS '@graphql(name: "hidden")';

-- -----------------------------------------------------
-- 6. ACTUALIZAR VERSIÓN DE LA BASE DE DATOS
-- -----------------------------------------------------
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518000000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
