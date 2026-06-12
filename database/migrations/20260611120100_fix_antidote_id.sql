-- Migration to fix the 'antidoto' (Spanish) item ID mapping in user saves
-- and map it to the correct standardized English ID 'antidote'.

DO $$
DECLARE
    r RECORD;
    v_inventory JSONB;
    v_qty INTEGER;
BEGIN
    FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
        v_inventory := r.save_data -> 'inventory';
        IF v_inventory IS NOT NULL AND jsonb_typeof(v_inventory) = 'object' THEN
            -- If the inventory has 'antidoto', map it to 'antidote'
            IF v_inventory ? 'antidoto' THEN
                v_qty := (v_inventory ->> 'antidoto')::INTEGER;
                -- Remove 'antidoto' key
                v_inventory := v_inventory - 'antidoto';
                -- Add qty to 'antidote' key (coalescing if it already exists)
                v_inventory := jsonb_set(
                    v_inventory,
                    ARRAY['antidote'],
                    to_jsonb(COALESCE((v_inventory ->> 'antidote')::INTEGER, 0) + v_qty)
                );
                
                UPDATE public.game_saves 
                SET save_data = jsonb_set(save_data, '{inventory}', v_inventory)
                WHERE user_id = r.user_id;
            END IF;
        END IF;
    END LOOP;
    
    -- Update scheme version in profiles
    UPDATE public.profiles SET db_version = 4;
    ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 4;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260611120100'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
