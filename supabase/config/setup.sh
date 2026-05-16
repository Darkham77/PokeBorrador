#!/bin/bash
set -e

echo "📁 Asegurando configuración de Kong..."
mkdir -p /etc/kong/declarative

# Generamos el kong.yml limpio
cat <<EOF > /etc/kong/declarative/kong.yml
_format_version: '1.1'
services:
  - name: auth
    url: http://gotrue:9999
    routes:
      - name: auth
        paths: [/auth/v1]
        strip_path: true
  - name: rest
    url: http://postgrest:3000
    routes:
      - name: rest
        paths: [/rest/v1]
        strip_path: true
  - name: realtime
    url: http://realtime:4000
    routes:
      - name: realtime
        paths: [/realtime/v1]
        strip_path: true
plugins:
  - name: cors
    config:
      origins: ['*']
      methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
      headers: [Accept, Accept-Language, Content-Language, Content-Type, Authorization, apikey, x-client-info]
      exposed_headers: [Content-Range, X-Total-Count]
      max_age: 3600
      credentials: true
  - name: key-auth
    config:
      key_names: [apikey]
consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}
EOF

echo "🛠️ Esperando a la base de datos..."
until psql -h db -U postgres -d postgres -c 'SELECT 1' > /dev/null 2>&1; do
  sleep 2
done

echo "🔐 Configurando roles y permisos..."
psql -h db -U postgres -d postgres -c "GRANT pg_read_server_files TO postgres;"
psql -h db -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='supabase_admin'" | grep -q 1 || psql -h db -U postgres -d postgres -c "CREATE ROLE supabase_admin WITH NOINHERIT CREATEROLE LOGIN NOREPLICATION;"
psql -h db -U postgres -d postgres -c "ALTER ROLE supabase_admin WITH SUPERUSER;"
psql -h db -U postgres -d postgres -c "GRANT pg_read_server_files TO supabase_admin;"
psql -h db -U postgres -d postgres -c "GRANT EXECUTE ON FUNCTION pg_read_file(text) TO supabase_admin;"

# Roles secundarios
for role in supabase_auth_admin authenticator; do
  psql -h db -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$role'" | grep -q 1 || psql -h db -U postgres -d postgres -c "CREATE ROLE $role WITH NOINHERIT LOGIN;"
done

for role in anon authenticated service_role; do
  psql -h db -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$role'" | grep -q 1 || psql -h db -U postgres -d postgres -c "CREATE ROLE $role WITH NOLOGIN NOINHERIT;"
done

echo "🏗️ Creando esquemas y extensiones..."
for ext in uuid-ossp pgcrypto pg_stat_statements; do
  psql -h db -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS \"$ext\" SCHEMA public;"
done

for schema in auth storage realtime graphql_public; do
  psql -h db -U postgres -d postgres -c "CREATE SCHEMA IF NOT EXISTS $schema;"
done

echo "🔑 Sincronizando contraseñas..."
psql -h db -U postgres -d postgres -c "ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';"
psql -h db -U postgres -d postgres -c "ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';"
psql -h db -U postgres -d postgres -c "ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';"

psql -h db -U postgres -d postgres -c "GRANT anon, authenticated, service_role TO authenticator;"
psql -h db -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;"
psql -h db -U postgres -d postgres -c "ALTER SCHEMA public OWNER TO supabase_admin;"
psql -h db -U postgres -d postgres -c "ALTER SCHEMA auth OWNER TO supabase_auth_admin;"
psql -h db -U postgres -d postgres -c "ALTER SCHEMA storage OWNER TO supabase_auth_admin;"

echo "✅ Sistema inicializado con éxito."
