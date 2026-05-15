-- JWT SETTINGS
-- Crea el esquema de auth y configura el secreto JWT

CREATE SCHEMA IF NOT EXISTS auth;
ALTER SCHEMA auth OWNER TO supabase_admin;

-- Configura el secreto JWT en la base de datos para que las funciones RLS puedan verificar los tokens
-- El valor se inyecta desde el entorno en el arranque del contenedor, pero creamos el esquema base aquí.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
END
$$;
