-- Migration: 20260909000000_add_war_dominance_rls_policies.sql
-- Description: Grant privileges and define RLS policies for public.war_dominance to authenticated players for weekly settlement.

-- 1. Grant table privileges to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.war_dominance TO authenticated;

-- 2. Define RLS policies for INSERT and UPDATE
DROP POLICY IF EXISTS "Upsert autenticado war_dominance" ON public.war_dominance;
CREATE POLICY "Upsert autenticado war_dominance" ON public.war_dominance 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Update autenticado war_dominance" ON public.war_dominance;
CREATE POLICY "Update autenticado war_dominance" ON public.war_dominance 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Version bump
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260909000000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
