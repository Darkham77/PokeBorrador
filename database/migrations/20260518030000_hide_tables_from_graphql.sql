-- =====================================================
-- DATABASE SECURITY & COMPLIANCE: HIDE TABLES FROM GRAPHQL & HIERARCHICAL PRIVILEGES
-- Fecha: 2026-05-18
-- Descripción: Resuelve advertencias pg_graphql ocultando todas las tablas (ya que no se usa GraphQL)
--              y revoca privilegios SELECT a 'anon' en tablas estrictamente privadas para mayor robustez.
-- =====================================================

-- 1. OCULTAR TODAS LAS TABLAS DE GRAPHQL
-- Dado que Poké Vicio utiliza exclusivamente REST (PostgREST) y no utiliza GraphQL,
-- ocultamos todas las tablas del esquema GraphQL de Supabase para silenciar advertencias y mejorar seguridad.

COMMENT ON TABLE public._migrations IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.profiles IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.game_saves IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.pokedex_entries IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.trade_offers IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.eggs IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.guardian_captures IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.war_defenders IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.chat_messages IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.system_config IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.friendships IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.global_chat_messages IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.war_factions IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.war_points IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.war_dominance IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.competition_entries IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.awards IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.competition_results IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.ranked_rules_config IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.claim_queue IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.events_config IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.market_listings IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.battle_invites IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.ranked_queue IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.passive_battle_reports IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.daycare_slots IS '@graphql(name: "hidden")';
COMMENT ON TABLE public.daycare_upgrades IS '@graphql(name: "hidden")';

-- 2. REVOCAR PRIVILEGIOS SELECT A 'anon' EN TABLAS PRIVADAS (Defensa en profundidad)
-- Esto evita que usuarios no autenticados puedan incluso intentar interactuar o mapear estas tablas.
-- Solo los usuarios autenticados ('authenticated') o de sistema ('service_role') retienen permisos.

REVOKE SELECT ON public.game_saves FROM anon;
REVOKE SELECT ON public.eggs FROM anon;
REVOKE SELECT ON public.daycare_slots FROM anon;
REVOKE SELECT ON public.daycare_upgrades FROM anon;
REVOKE SELECT ON public.trade_offers FROM anon;
REVOKE SELECT ON public.claim_queue FROM anon;
REVOKE SELECT ON public.battle_invites FROM anon;
REVOKE SELECT ON public.ranked_queue FROM anon;
REVOKE SELECT ON public.passive_battle_reports FROM anon;
REVOKE SELECT ON public.friendships FROM anon;
REVOKE SELECT ON public.chat_messages FROM anon;
REVOKE SELECT ON public.global_chat_messages FROM anon;
REVOKE SELECT ON public.awards FROM anon;
REVOKE SELECT ON public.competition_entries FROM anon;
REVOKE SELECT ON public._migrations FROM anon;

-- Asegurar que los roles autenticados mantengan permisos funcionales SELECT en ellas
GRANT SELECT ON public.game_saves TO authenticated;
GRANT SELECT ON public.eggs TO authenticated;
GRANT SELECT ON public.daycare_slots TO authenticated;
GRANT SELECT ON public.daycare_upgrades TO authenticated;
GRANT SELECT ON public.trade_offers TO authenticated;
GRANT SELECT ON public.claim_queue TO authenticated;
GRANT SELECT ON public.battle_invites TO authenticated;
GRANT SELECT ON public.ranked_queue TO authenticated;
GRANT SELECT ON public.passive_battle_reports TO authenticated;
GRANT SELECT ON public.friendships TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT SELECT ON public.global_chat_messages TO authenticated;
GRANT SELECT ON public.awards TO authenticated;
GRANT SELECT ON public.competition_entries TO authenticated;

-- 3. ACTUALIZAR VERSIÓN DE LA BASE DE DATOS
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260518030000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
