-- =====================================================
-- ISO 8601 DATE STANDARDIZATION & INTEGRITY PATCH
-- Fecha: 2026-05-15
-- Descripción: Normaliza fechas legacy y restaura integridad de tablas faltantes.
-- =====================================================

-- check: { "table": "market_listings", "column": "created_at" }

-- 0. Ensure tables exist (Fix for project validator integrity)
-- These tables were missing from migrations but present in schema.ts

CREATE TABLE IF NOT EXISTS public.market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_name TEXT,
    listing_type TEXT,
    data JSONB,
    price BIGINT,
    status TEXT DEFAULT 'active',
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.battle_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ranked_queue (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    elo INTEGER DEFAULT 1000,
    status TEXT DEFAULT 'searching',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.passive_battle_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    result TEXT,
    report_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daycare_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pokemon_id TEXT,
    slot_index INTEGER,
    deposited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daycare_upgrades (
    player_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    egg_capacity INTEGER DEFAULT 1,
    slot_boost INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pokedex_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pokemon_id INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    offer_pokemon JSONB,
    offer_items JSONB,
    offer_money BIGINT DEFAULT 0,
    request_pokemon JSONB,
    request_items JSONB,
    request_money BIGINT DEFAULT 0,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eggs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    egg_id TEXT,
    steps_remaining INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guardian_captures (
    capture_date TEXT,
    map_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    winner_faction TEXT,
    pts_awarded INTEGER DEFAULT 150,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (capture_date, map_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.war_defenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id TEXT,
    pokemon_uid TEXT,
    pokemon_data JSONB,
    wins_count INTEGER DEFAULT 0,
    week_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "senderId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "senderName" TEXT,
    message TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Market Listings
UPDATE market_listings 
SET created_at = REPLACE(created_at, ' ', 'T') || 'Z'
WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';

-- 2. Social & Interactions
UPDATE friendships SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';
UPDATE battle_invites SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';
UPDATE global_chat_messages SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';
UPDATE passive_battle_reports SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';

-- 3. Daycare & Pokedex
UPDATE daycare_slots SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';
UPDATE pokedex_entries SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';

-- 4. Trade & Claims
UPDATE trade_offers SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';
UPDATE claim_queue SET created_at = REPLACE(created_at, ' ', 'T') || 'Z' WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%';

-- Establisth version
INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260515115500'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
