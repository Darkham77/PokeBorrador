-- Migration: Add RLS policy for updating trade offers
-- Description: Allow users to update trade_offers if they are the sender (to claim or cancel) or receiver (to reject).

DROP POLICY IF EXISTS "Actualizar propia oferta" ON public.trade_offers;
CREATE POLICY "Actualizar propia oferta" ON public.trade_offers 
  FOR UPDATE 
  USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

-- Update DB version tracking
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '"20260519234000"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
