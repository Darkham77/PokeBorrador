-- SYSTEM SCHEMAS
-- 1. Esquemas de Sistema
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS graphql_public;

-- 2. Propietarios
ALTER SCHEMA storage OWNER TO supabase_storage_admin;
ALTER SCHEMA realtime OWNER TO supabase_admin;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
ALTER SCHEMA graphql_public OWNER TO supabase_admin;

-- 3. Publicaciones
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
END $$;
