-- =====================================================
-- DATABASE HARDENING: FUNCTION PRIVILEGES SECURITY
-- Fecha: 2026-05-18
-- Descripción:
--  Revoca los privilegios de ejecución por defecto (PUBLIC/anon) en las funciones críticas 
--  de tipo SECURITY DEFINER, limitando el acceso estrictamente a los roles autorizados:
--  'authenticated' (usuarios registrados del juego) y 'service_role' (administrador/sistema).
-- =====================================================

-- 1. accept_trade_v2
REVOKE EXECUTE ON FUNCTION public.accept_trade_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trade_v2(uuid) TO authenticated, service_role;

-- 2. buy_listing_v2
REVOKE EXECUTE ON FUNCTION public.buy_listing_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_listing_v2(uuid) TO authenticated, service_role;

-- 3. cancel_listing_v2
REVOKE EXECUTE ON FUNCTION public.cancel_listing_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_listing_v2(uuid) TO authenticated, service_role;

-- 4. claim_asset_v2
REVOKE EXECUTE ON FUNCTION public.claim_asset_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_asset_v2(uuid) TO authenticated, service_role;

-- 5. execute_trade
REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_trade(uuid) TO authenticated, service_role;

-- 6. publish_listing_v2
REVOKE EXECUTE ON FUNCTION public.publish_listing_v2(text, jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_listing_v2(text, jsonb, bigint) TO authenticated, service_role;

-- 7. save_game_trusted
REVOKE EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_game_trusted(jsonb, uuid) TO authenticated, service_role;

-- 8. send_trade_offer_v2
REVOKE EXECUTE ON FUNCTION public.send_trade_offer_v2(uuid, jsonb, jsonb, bigint, jsonb, jsonb, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_trade_offer_v2(uuid, jsonb, jsonb, bigint, jsonb, jsonb, bigint, text) TO authenticated, service_role;

-- -----------------------------------------------------
-- 2. ACTUALIZACIÓN DE VERSIÓN DE BASE DE DATOS
-- -----------------------------------------------------
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518050000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
