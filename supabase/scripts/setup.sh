#!/bin/bash
# =============================================================
# POKÉ VICIO - STANDARDS COMPLIANT ORCHESTRATOR
# Respeta la separación entre SCHEMAS y MIGRATIONS.
# =============================================================
set -e

echo "🛠️ Esperando a que el motor de DB en 'db:5432' esté listo..."
until psql -h db -U postgres -d postgres -c 'SELECT 1' > /dev/null 2>&1; do
  sleep 2
done

# --- 1. CONFIGURACIÓN DE INFRAESTRUCTURA ---
echo "📁 Generando configuración de Kong..."
mkdir -p /etc/kong/declarative
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

# --- 1. SINCRONIZAR SEGURIDAD BASE ---
echo "🔑 Sincronizando seguridad base..."
for role in supabase_admin supabase_auth_admin supabase_storage_admin authenticator; do
  echo "  → Sincronizando contraseña y privilegios para: $role"
  psql -h db -U postgres -d postgres -c "ALTER ROLE $role WITH SUPERUSER PASSWORD '${POSTGRES_PASSWORD}';"
done
echo "  ✓ Seguridad base sincronizada."

# --- 2. ESPERAR A SUPABASE AUTH (Crucial para auth.users) ---
echo "⏳ Esperando a que Supabase Auth cree la tabla 'auth.users'..."
until psql -h db -U postgres -d postgres -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'" | grep -q 1; do
  sleep 2
done
echo "  ✓ Tabla 'auth.users' detectada."

# --- 3. APLICAR ESQUEMAS DEL JUEGO (database/schemas) ---
echo "🏛️ Aplicando Esquemas del Juego (Folder: schemas)..."
for filepath in $(ls /game-schemas/*.sql | sort); do
  echo "  → Esquema: $(basename "$filepath")"
  psql -h db -U postgres -d postgres -f "$filepath"
done

# --- 4. APLICAR MIGRACIONES (database/migrations) ---
echo "📋 Aplicando Migraciones (Folder: migrations)..."
psql -h db -U postgres -d postgres -c "CREATE TABLE IF NOT EXISTS public._applied_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());"
for filepath in $(ls /migrations/*.sql | sort); do
  filename=$(basename "$filepath")
  already=$(psql -h db -U postgres -d postgres -tAc "SELECT 1 FROM public._applied_migrations WHERE filename='$filename'")
  if [ "$already" != "1" ]; then
    echo "  → Migración: $filename"
    psql -h db -U postgres -d postgres -f "$filepath"
    psql -h db -U postgres -d postgres -c "INSERT INTO public._applied_migrations (filename) VALUES ('$filename');"
  fi
done

echo "✅ SISTEMA TOTALMENTE CONFIGURADO Y SINCRONIZADO."
