-- Migration: 20260519102000_implement_change_username_rpc.sql
-- Description: Adds last_renamed_at column to profiles and implements change_username RPC.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_renamed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.change_username(new_username text)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_current_username text;
    v_last_rename timestamptz;
    v_thirty_days_ago timestamptz;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    IF new_username IS NULL OR length(trim(new_username)) < 3 OR length(trim(new_username)) > 15 THEN
        RAISE EXCEPTION 'El nombre de entrenador debe tener entre 3 y 15 caracteres.';
    END IF;

    SELECT username, last_renamed_at 
    INTO v_current_username, v_last_rename
    FROM public.profiles 
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil no encontrado.';
    END IF;

    IF trim(new_username) = v_current_username THEN
        RAISE EXCEPTION 'El nuevo nombre es idéntico al actual.';
    END IF;

    IF v_last_rename IS NOT NULL THEN
        v_thirty_days_ago := now() - INTERVAL '30 days';
        IF v_last_rename > v_thirty_days_ago THEN
            RAISE EXCEPTION 'Solo puedes cambiar tu nombre una vez cada 30 días. Debes esperar al menos 30 días.';
        END IF;
    END IF;

    UPDATE public.profiles 
    SET username = trim(new_username), 
        last_renamed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.change_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_username(text) TO authenticated, service_role;

-- Update DB version tracking
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260519102000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
