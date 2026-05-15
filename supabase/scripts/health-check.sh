#!/bin/bash

# HEALTH CHECK - SUPABASE POKÉ VICIO
# Verifica que todos los servicios estén corriendo y respondiendo.

set -e

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: Archivo .env no encontrado."
    exit 1
fi

echo "🔍 Verificando estado del servidor Supabase..."

check_service() {
    local name=$1
    local url=$2
    printf "Testing %-15s: " "$name"
    if curl -s --head "$url" | grep "200\|401\|404" > /dev/null; then
        echo "✅ OK"
    else
        echo "❌ ERROR"
    fi
}

echo "--- Servicios ---"
check_service "API Gateway" "http://localhost:${KONG_HTTP_PORT}"
check_service "Auth (GoTrue)" "http://localhost:${KONG_HTTP_PORT}/auth/v1/health"
check_service "Rest (PostgREST)" "http://localhost:${KONG_HTTP_PORT}/rest/v1/"
check_service "Realtime" "http://localhost:${KONG_HTTP_PORT}/realtime/v1/health"

echo "--- Base de Datos ---"
if docker exec supabase-db-pokevicio pg_isready -U postgres > /dev/null; then
    echo "Postgres:        ✅ OK"
else
    echo "Postgres:        ❌ ERROR"
fi

echo "--------------------------------"
echo "Servidor listo para recibir conexiones."
