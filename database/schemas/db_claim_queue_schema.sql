-- =====================================================
-- CLAIM QUEUE SCHEMA (Baseline)
-- Fecha: 2026-04-17
-- =====================================================

CREATE TABLE IF NOT EXISTS public.claim_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'trade', 'gts', 'event', 'gift'
  source_id UUID,            -- ID del trade u oferta original
  asset_data JSONB NOT NULL, -- { type: 'pokemon'|'item'|'money', data: {...} }
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- Index for performance on common lookups
CREATE INDEX IF NOT EXISTS idx_claim_queue_user ON public.claim_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_queue_status ON public.claim_queue(status);
