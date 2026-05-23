-- check: { "table": "profiles", "column": "badges" }
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges INTEGER DEFAULT 0;
