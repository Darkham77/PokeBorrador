-- =============================================================
-- POKÉ VICIO - ESQUEMAS DE SISTEMA (SUPABASE) - MASTER VERSION
-- =============================================================

-- 1. Crear Esquemas
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. Asignar Propietarios (Crucial para permisos de servicios)
ALTER SCHEMA storage OWNER TO supabase_storage_admin;
ALTER SCHEMA realtime OWNER TO supabase_admin;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
ALTER SCHEMA graphql_public OWNER TO supabase_admin;
ALTER SCHEMA auth OWNER TO supabase_auth_admin;

-- 3. Permisos en Esquemas (Fix para Postgres 15+)
-- Garantizamos acceso total a todos los roles del stack de Supabase
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_admin, supabase_auth_admin, supabase_storage_admin, authenticator;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin, supabase_admin;
GRANT ALL ON SCHEMA storage TO postgres, supabase_admin, supabase_storage_admin;
GRANT ALL ON SCHEMA realtime TO postgres, supabase_admin;
GRANT ALL ON SCHEMA _realtime TO postgres, supabase_admin;

-- 4. Privilegios por Defecto (Para tablas futuras creadas por superusuario)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin, supabase_admin;

-- 5. Publicaciones para Realtime (Vacía para que las migraciones la manejen)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;
