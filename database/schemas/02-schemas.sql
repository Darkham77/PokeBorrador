-- SYSTEM SCHEMAS
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS _realtime;

ALTER SCHEMA storage OWNER TO supabase_admin;
ALTER SCHEMA graphql_public OWNER TO supabase_admin;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
